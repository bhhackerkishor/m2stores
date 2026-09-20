import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { withTransaction } from "@/lib/transactions";
import { Order, OrderStatus } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { InventoryService } from "./inventory.service";
import { InventoryReservation } from "@/models/Inventory";
import { AuditLog } from "@/models/AuditLog";
import { canTransition, customerCanCancel, isAdminTransitionAllowed } from "./order-status";
import { getPaymentProvider } from "@/services/payment/phonepe.provider";
import { AppError, InvalidStateTransitionError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Order domain service — the ONLY place that mutates orderStatus.
 * All transitions go through `transition()` so invalid jumps are rejected.
 * Inventory handling on cancel:
 *   reservation ACTIVE  -> release (reserved stock freed)
 *   reservation COMMITTED (or missing) -> restock (physical stock += qty)
 * Refunds trigger via PaymentProvider when money was captured.
 */
export class OrderService {
  static async getForCustomer(orderNumber: string, userId: string) {
    await connectDB();
    const order: any = await Order.findOne({ orderNumber, userId }).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    return order;
  }

  static async listForCustomer(userId: string, page = 1, limit = 10, status?: string) {
    await connectDB();
    const filter: any = { userId };
    if (status) filter.orderStatus = status;
    const total = await Order.countDocuments(filter);
    const items = await Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async adminList(opts: { page?: number; limit?: number; status?: string; q?: string }) {
    await connectDB();
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const filter: any = {};
    if (opts.status) filter.orderStatus = opts.status;
    if (opts.q) filter.orderNumber = { $regex: opts.q.toUpperCase(), $options: "i" };
    const total = await Order.countDocuments(filter);
    const items = await Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async adminGet(orderNumber: string) {
    await connectDB();
    const order: any = await Order.findOne({ orderNumber }).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    const payment: any = await Payment.findOne({ orderId: order._id }).lean();
    return { order, payment };
  }

  private static async applyTransition(
    order: any,
    to: OrderStatus,
    actor: { id?: string; notes?: string },
    session?: mongoose.ClientSession,
    isAdmin = false
  ) {
    const from: OrderStatus = order.orderStatus;
    if (from === to) return { duplicate: true };
    if (isAdmin ? !isAdminTransitionAllowed(from, to) : !canTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to);
    }
    order.orderStatus = to;
    order.statusHistory.push({ status: to, timestamp: new Date(), updatedBy: actor.id as any, notes: actor.notes });
    await order.save(session ? { session } : undefined);
    return { duplicate: false };
  }

  /** Customer/admin cancellation — idempotent. */
  static async cancelOrder(orderNumber: string, actorUserId: string, reason: string, actorRole = "CUSTOMER") {
    if (!reason || reason.trim().length < 3) throw new AppError("Cancellation reason is required", 400, "VALIDATION_ERROR");
    await connectDB();
    const order: any = await Order.findOne({ orderNumber });
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (actorRole === "CUSTOMER" && String(order.userId) !== String(actorUserId)) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (order.orderStatus === "CANCELLED") {
      logger.info("Duplicate cancel ignored (idempotent)", "order", { orderNumber });
      return { order: order.toObject(), duplicate: true };
    }
    if (!customerCanCancel(order.orderStatus)) {
      throw new AppError(`Order cannot be cancelled in status ${order.orderStatus}`, 400, "INVALID_STATUS");
    }

    return withTransaction(async (session) => {
      // Re-read inside tx
      const o: any = await Order.findOne({ orderNumber }, null, session ? { session } : undefined);
      if (!o) throw new AppError("Order not found", 404, "NOT_FOUND");
      if (o.orderStatus === "CANCELLED") return { order: o.toObject(), duplicate: true };
      if (!customerCanCancel(o.orderStatus)) {
        throw new AppError(`Order cannot be cancelled in status ${o.orderStatus}`, 400, "INVALID_STATUS");
      }

      // Inventory: release reserved OR restock committed, per line
      for (const item of o.items) {
        const res: any = await InventoryReservation.findOne({ orderId: o._id, sku: item.sku }).lean();
        if (!res || res.status === "COMMITTED") {
          // Committed (paid/COD-shipped) — put physical units back (idempotent per line)
          await InventoryService.restockIdempotent({
            productId: String(item.productId),
            sku: item.sku,
            quantity: item.quantity,
            operationId: `RST_CANCEL_${orderNumber}_${String(item.sku).toUpperCase()}`,
            orderId: String(o._id),
            reason: `Cancel ${orderNumber}: restock committed line`,
          });
        } else {
          await InventoryService.release({
            productId: String(item.productId),
            sku: item.sku,
            quantity: item.quantity,
            orderId: String(o._id),
            operationId: `REL_${orderNumber}_${String(item.sku).toUpperCase()}`,
            reason: `Cancel ${orderNumber}`,
          });
        }
      }

      // Refund captured online payments via provider abstraction
      let refundStatus: string | undefined;
      const payment: any = await Payment.findOne({ orderId: o._id }, null, session ? { session } : undefined);
      if (payment && payment.status === "PAID" && payment.provider === "PHONEPE") {
        try {
          const provider = getPaymentProvider("PHONEPE");
          await provider.refundPayment({
            paymentId: payment.paymentId,
            orderId: String(o._id),
            amount: o.pricingSnapshot.grandTotal,
            reason: `Cancel ${orderNumber}: ${reason}`,
          });
          refundStatus = "PROCESSING";
        } catch (e: any) {
          logger.error("Cancel refund failed", "order", { orderNumber, error: String(e?.message || e) });
          refundStatus = "FAILED";
        }
      }

      await this.applyTransition(o, "CANCELLED", { id: actorUserId, notes: reason }, session as any);
      o.cancellation = { reason, cancelledAt: new Date(), cancelledBy: actorUserId as any, refundStatus } as any;
      await o.save(session ? { session } : undefined);

      // Release coupon usage so limits aren't burned by cancelled orders
      if (o.pricingSnapshot?.couponCode) {
        const { Coupon } = await import("@/models/Coupon");
        await Coupon.findOneAndUpdate(
          { code: o.pricingSnapshot.couponCode },
          { $inc: { usageCount: -1, [`perUserUsageCount.${o.userId}`]: -1 } },
          session ? { session } : undefined
        ).catch(() => {});
        // Clamp negatives best-effort (abuse-safe: never below zero)
        await Coupon.updateOne(
          { code: o.pricingSnapshot.couponCode, usageCount: { $lt: 0 } },
          { $set: { usageCount: 0 } }
        ).catch(() => {});
      }

      try {
        await AuditLog.create(
          [
            {
              admin: actorUserId as any,
              action: "ORDER_CANCELLED",
              entity: "Order",
              entityId: orderNumber,
              newValue: { reason, refundStatus } as any,
              timestamp: new Date(),
            },
          ],
          session ? { session } : undefined
        );
      } catch { /* audit best-effort */ }

      logger.info("Order cancelled", "order", { orderNumber, refundStatus });
      const cancelled = o.toObject();
      const { NotificationService } = await import("./notification/notification.service");
      await NotificationService.notify("ORDER_CANCELLED", {
        userId: String(o.userId),
        orderNumber,
        refund: refundStatus && refundStatus !== "FAILED",
      });
      return { order: cancelled, duplicate: false };
    });
  }

  /**
   * Admin fulfillment transition (PROCESSING/PACKED/SHIPPED/...).
   * On SHIPPED for COD/reserved lines, commits inventory (stock leaves warehouse).
   * Tracking number required for SHIPPED.
   */
  static async adminTransition(
    orderNumber: string,
    to: OrderStatus,
    adminId: string,
    opts?: { notes?: string; trackingNumber?: string; courier?: string }
  ) {
    await connectDB();
    if (to === "CANCELLED") {
      return this.cancelOrder(orderNumber, adminId, opts?.notes || "Cancelled by admin", "ADMIN");
    }
    return withTransaction(async (session) => {
      const o: any = await Order.findOne({ orderNumber }, null, session ? { session } : undefined);
      if (!o) throw new AppError("Order not found", 404, "NOT_FOUND");
      const from = o.orderStatus as OrderStatus;

      if (to === "SHIPPED") {
        if (!opts?.trackingNumber) throw new AppError("Tracking number is required to ship", 400, "TRACKING_REQUIRED");
        // Commit any still-reserved lines (COD flow) exactly once
        for (const item of o.items) {
          const res: any = await InventoryReservation.findOne({ orderId: o._id, sku: item.sku }).lean();
          if (res?.status === "ACTIVE") {
            await InventoryService.commit({
              productId: String(item.productId),
              sku: item.sku,
              quantity: item.quantity,
              orderId: String(o._id),
              operationId: `COMMIT_${orderNumber}_${String(item.sku).toUpperCase()}`,
              reason: `Ship ${orderNumber}`,
            });
          }
        }
        o.shippingDetails = {
          ...(o.shippingDetails || {}),
          courier: opts.courier || o.shippingDetails?.courier || "Manual",
          trackingNumber: opts.trackingNumber,
          shippedAt: new Date(),
        };
      }
      if (to === "DELIVERED") {
        o.shippingDetails = { ...(o.shippingDetails || {}), deliveredAt: new Date() };
        // COD cash collected on delivery
        const payment: any = await Payment.findOne({ orderId: o._id }, null, session ? { session } : undefined);
        if (payment && payment.provider === "COD" && payment.status !== "PAID") {
          payment.status = "PAID";
          await payment.save(session ? { session } : undefined);
        }
        if (o.paymentInfo?.method === "COD") o.paymentInfo.status = "PAID";
      }

      const { duplicate } = await this.applyTransition(o, to, { id: adminId, notes: opts?.notes }, session as any, true);
      if (!duplicate) {
        try {
          await AuditLog.create(
            [
              {
                admin: adminId as any,
                action: "ORDER_STATUS_CHANGED",
                entity: "Order",
                entityId: orderNumber,
                oldValue: { from } as any,
                newValue: { to, trackingNumber: opts?.trackingNumber } as any,
                timestamp: new Date(),
              },
            ],
            session ? { session } : undefined
          );
        } catch { /* best-effort */ }
      }
      logger.info("Order status changed", "order", { orderNumber, from, to });
      const finished = o.toObject();
      const eventMap: Record<string, "ORDER_PACKED" | "ORDER_SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | null> = {
        PACKED: "ORDER_PACKED",
        SHIPPED: "ORDER_SHIPPED",
        OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
        DELIVERED: "DELIVERED",
      };
      const event = eventMap[to];
      if (event && !duplicate) {
        const { NotificationService } = await import("./notification/notification.service");
        await NotificationService.notify(event, {
          userId: String(o.userId),
          orderNumber,
          tracking: o.shippingDetails?.trackingNumber,
        });
      }
      return { order: finished, duplicate, from };
    });
  }

  // Back-compat wrappers used by older call sites
  static async createOrder(...args: any[]) {
    const { CheckoutService } = await import("./checkout.service");
    throw new AppError("Use CheckoutService.createOrder (snapshots + idempotency live there)", 410, "GONE");
  }
}
