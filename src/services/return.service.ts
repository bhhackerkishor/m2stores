import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { withTransaction } from "@/lib/transactions";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Setting } from "@/models/Setting";
import { ReturnRequest } from "@/models/ReturnRequest";
import { InventoryService } from "./inventory.service";
import { getPaymentProvider } from "./payment/phonepe.provider";
import { NotificationService } from "./notification/notification.service";
import { AuditLog } from "@/models/AuditLog";
import { canTransition } from "./order-status";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const round = (n: number) => Math.round(n * 100) / 100;

function rmaNumber(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RMA-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function returnWindowDays(): Promise<number> {
  await connectDB();
  const s: any = await Setting.findOne().lean().catch(() => null);
  return s?.returnWindowDays ?? 7;
}

/** Already-returned qty per SKU across non-rejected/cancelled returns. */
async function returnedQtyMap(orderId: string): Promise<Map<string, number>> {
  const prior: any[] = await ReturnRequest.find({
    orderId,
    status: { $in: ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED"] },
  }).lean();
  const map = new Map<string, number>();
  for (const r of prior) {
    for (const it of r.items) {
      map.set(it.sku, (map.get(it.sku) || 0) + it.quantity);
    }
  }
  return map;
}

export class ReturnService {
  static async eligibleItems(orderNumber: string, userId: string) {
    await connectDB();
    const order: any = await Order.findOne({ orderNumber, userId }).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (order.orderStatus !== "DELIVERED") {
      return { eligible: false, reason: `Returns available only on delivered orders (current: ${order.orderStatus})`, items: [] };
    }
    const windowDays = await returnWindowDays();
    const deliveredAt = new Date(order.shippingDetails?.deliveredAt || order.updatedAt);
    const ageDays = (Date.now() - deliveredAt.getTime()) / 86400000;
    if (ageDays > windowDays) {
      return { eligible: false, reason: `Return window of ${windowDays} days has expired`, items: [] };
    }
    const returned = await returnedQtyMap(String(order._id));
    const items = (order.items || []).map((it: any) => {
      const done = returned.get(it.sku) || 0;
      return {
        productId: String(it.productId),
        sku: it.sku,
        name: it.nameSnapshot,
        image: it.imageSnapshot,
        purchasedQty: it.quantity,
        returnedQty: done,
        returnableQty: Math.max(0, it.quantity - done),
        unitPrice: it.salePrice,
      };
    });
    return { eligible: items.some((i: any) => i.returnableQty > 0), reason: "", items, windowDays };
  }

  static async request(userId: string, orderNumber: string, input: { items: Array<{ sku: string; quantity: number }>; reason: string; idempotencyKey?: string }) {
    if (!input.reason?.trim()) throw new AppError("Return reason is required", 400, "VALIDATION_ERROR");
    if (!input.items?.length) throw new AppError("Select at least one item", 400, "VALIDATION_ERROR");
    await connectDB();

    if (input.idempotencyKey) {
      const dup: any = await ReturnRequest.findOne({ idempotencyKey: input.idempotencyKey }).lean();
      if (dup) {
        logger.info("Duplicate return request (idempotent)", "return", { idempotencyKey: input.idempotencyKey });
        return { request: dup, duplicate: true };
      }
    }

    const order: any = await Order.findOne({ orderNumber, userId });
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (order.orderStatus !== "DELIVERED") {
      throw new AppError(`Returns available only on delivered orders (current: ${order.orderStatus})`, 400, "INVALID_STATUS");
    }
    const windowDays = await returnWindowDays();
    const deliveredAt = new Date(order.shippingDetails?.deliveredAt || order.updatedAt);
    if ((Date.now() - deliveredAt.getTime()) / 86400000 > windowDays) {
      throw new AppError(`Return window of ${windowDays} days has expired`, 400, "WINDOW_EXPIRED");
    }

    const returned = await returnedQtyMap(String(order._id));
    const bySku = new Map((order.items || []).map((it: any) => [it.sku, it]));
    const retItems: any[] = [];
    let refundPreview = 0;

    for (const req of input.items) {
      const sku = req.sku.toUpperCase();
      const line: any = bySku.get(sku);
      if (!line) throw new AppError(`SKU ${sku} is not part of this order`, 400, "INVALID_ITEM");
      if (!Number.isInteger(req.quantity) || req.quantity < 1) throw new AppError(`Invalid quantity for ${sku}`, 400, "VALIDATION_ERROR");
      const already = returned.get(sku) || 0;
      if (already + req.quantity > line.quantity) {
        throw new AppError(`Only ${line.quantity - already} units of ${sku} are returnable`, 400, "QTY_EXCEEDED");
      }
      // Proportional refund: unit sale price + unit tax share, minus proportional coupon/offer share
      const units = line.quantity;
      const unitTax = (line.taxAmount || 0) / units;
      const orderEligible = (order.pricingSnapshot.subtotal || 0);
      const orderDisc = (order.pricingSnapshot.couponDiscount || 0) + (order.pricingSnapshot.offerDiscount || 0);
      const unitDiscShare = orderEligible > 0 ? (line.finalLineTotal / orderEligible) * (orderDisc / units) : 0;
      const refundAmount = round((line.salePrice + unitTax - unitDiscShare) * req.quantity);
      refundPreview += refundAmount;
      retItems.push({
        productId: line.productId,
        sku,
        quantity: req.quantity,
        unitPrice: line.salePrice,
        refundAmount: Math.max(0, refundAmount),
      });
    }

    return withTransaction(async (session) => {
      // Re-read order inside the transaction: the outer doc may be stale
      // across automatic retries (mutating it would skip the transition).
      const fresh: any = await Order.findOne({ orderNumber, userId }, null, session ? { session } : undefined);
      if (!fresh) throw new AppError("Order not found", 404, "NOT_FOUND");
      // Another retry may have already created this idempotent request
      if (input.idempotencyKey) {
        const raced: any = await ReturnRequest.findOne({ idempotencyKey: input.idempotencyKey }).lean();
        if (raced) return { request: raced, duplicate: true };
      }
      const created: any[] = await ReturnRequest.create(
        [
          {
            rmaNumber: rmaNumber(),
            orderId: fresh._id,
            orderNumber,
            userId,
            items: retItems,
            reason: input.reason.trim().slice(0, 1000),
            status: "REQUESTED",
            pickupStatus: "PENDING",
            refund: { status: "REQUESTED", amount: round(refundPreview) },
            requestedAt: new Date(),
            idempotencyKey: input.idempotencyKey,
          },
        ],
        session ? { session } : undefined
      );
      const r = created[0];

      // Drive order machine: DELIVERED -> RETURN_REQUESTED (fresh read only)
      if (fresh.orderStatus === "DELIVERED" && canTransition("DELIVERED", "RETURN_REQUESTED")) {
        fresh.orderStatus = "RETURN_REQUESTED";
        fresh.statusHistory.push({ status: "RETURN_REQUESTED", timestamp: new Date(), updatedBy: userId as any, notes: `Return ${r.rmaNumber} requested` });
        fresh.returnDetails = { reason: input.reason.trim().slice(0, 200), requestedAt: new Date() } as any;
        await fresh.save(session ? { session } : undefined);
      }

      await NotificationService.notify("RETURN_UPDATE", {
        userId: String(fresh.userId),
        orderNumber,
        message: `Return ${r.rmaNumber} requested and pending review.`,
        link: `/orders/${orderNumber}`,
      });

      logger.info("Return requested", "return", { rma: r.rmaNumber, orderNumber });
      return { request: r.toObject(), duplicate: false };
    });
  }

  static async adminList(status?: string, page = 1, limit = 20) {
    await connectDB();
    const filter: any = {};
    if (status) filter.status = status;
    const total = await ReturnRequest.countDocuments(filter);
    const items = await ReturnRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async adminGet(id: string) {
    await connectDB();
    const r: any = await ReturnRequest.findById(id).lean();
    if (!r) throw new AppError("Return not found", 404, "NOT_FOUND");
    const order: any = await Order.findById(r.orderId).lean();
    return { request: r, order };
  }

  static async approve(id: string, adminId: string, pickupStatus = "SCHEDULED", notes?: string) {
    await connectDB();
    return withTransaction(async (session) => {
      const r: any = await ReturnRequest.findById(id, null, session ? { session } : undefined);
      if (!r) throw new AppError("Return not found", 404, "NOT_FOUND");
      if (r.status !== "REQUESTED") {
        if (r.status === "APPROVED") return { request: r.toObject(), duplicate: true };
        throw new AppError(`Cannot approve return in status ${r.status}`, 400, "INVALID_STATUS");
      }
      r.status = "APPROVED";
      r.pickupStatus = pickupStatus as any;
      r.adminNotes = notes?.slice(0, 2000);
      r.refund.status = "APPROVED";
      await r.save(session ? { session } : undefined);

      const order: any = await Order.findById(r.orderId, null, session ? { session } : undefined);
      if (order && canTransition(order.orderStatus, "RETURN_APPROVED")) {
        order.orderStatus = "RETURN_APPROVED";
        order.statusHistory.push({ status: "RETURN_APPROVED", timestamp: new Date(), updatedBy: adminId as any, notes: `Return ${r.rmaNumber} approved` });
        await order.save(session ? { session } : undefined);
      }
      await AuditLog.create([{ admin: adminId as any, action: "RETURN_APPROVED", entity: "ReturnRequest", entityId: r.rmaNumber, timestamp: new Date() }], session ? { session } : undefined).catch(() => {});
      await NotificationService.notify("RETURN_UPDATE", { userId: String(r.userId), orderNumber: r.orderNumber, message: `Return ${r.rmaNumber} approved. Pickup ${pickupStatus.toLowerCase()}.`, link: `/orders/${r.orderNumber}` });
      return { request: r.toObject(), duplicate: false };
    });
  }

  static async reject(id: string, adminId: string, reason: string) {
    await connectDB();
    if (!reason?.trim()) throw new AppError("Rejection reason is required", 400, "VALIDATION_ERROR");
    return withTransaction(async (session) => {
      const r: any = await ReturnRequest.findById(id, null, session ? { session } : undefined);
      if (!r) throw new AppError("Return not found", 404, "NOT_FOUND");
      if (r.status !== "REQUESTED") throw new AppError(`Cannot reject return in status ${r.status}`, 400, "INVALID_STATUS");
      r.status = "REJECTED";
      r.adminNotes = reason.slice(0, 2000);
      r.resolvedAt = new Date();
      r.refund.status = "FAILED";
      r.refund.failureReason = reason.slice(0, 500);
      await r.save(session ? { session } : undefined);

      const order: any = await Order.findById(r.orderId, null, session ? { session } : undefined);
      if (order && canTransition(order.orderStatus, "RETURN_REJECTED")) {
        order.orderStatus = "RETURN_REJECTED";
        order.statusHistory.push({ status: "RETURN_REJECTED", timestamp: new Date(), updatedBy: adminId as any, notes: reason });
        await order.save(session ? { session } : undefined);
      }
      await AuditLog.create([{ admin: adminId as any, action: "RETURN_REJECTED", entity: "ReturnRequest", entityId: r.rmaNumber, timestamp: new Date() }], session ? { session } : undefined).catch(() => {});
      await NotificationService.notify("RETURN_UPDATE", { userId: String(r.userId), orderNumber: r.orderNumber, message: `Return ${r.rmaNumber} was not approved: ${reason}`, link: `/orders/${r.orderNumber}` });
      return { request: r.toObject(), duplicate: false };
    });
  }

  /** Warehouse received the goods: restock + order RETURNED. Idempotent. */
  static async receive(id: string, adminId: string) {
    await connectDB();
    return withTransaction(async (session) => {
      const r: any = await ReturnRequest.findById(id, null, session ? { session } : undefined);
      if (!r) throw new AppError("Return not found", 404, "NOT_FOUND");
      if (r.status === "RECEIVED" || r.status === "REFUNDED") return { request: r.toObject(), duplicate: true };
      if (r.status !== "APPROVED") throw new AppError(`Cannot receive return in status ${r.status}`, 400, "INVALID_STATUS");

      for (const it of r.items) {
        await InventoryService.restockIdempotent({
          productId: String(it.productId),
          sku: it.sku,
          quantity: it.quantity,
          operationId: `RST_${r.rmaNumber}_${it.sku}`,
          orderId: String(r.orderId),
          reason: `Return ${r.rmaNumber} received`,
        });
      }
      r.status = "RECEIVED";
      r.pickupStatus = "RECEIVED";
      await r.save(session ? { session } : undefined);

      const order: any = await Order.findById(r.orderId, null, session ? { session } : undefined);
      if (order && canTransition(order.orderStatus, "RETURNED")) {
        order.orderStatus = "RETURNED";
        order.statusHistory.push({ status: "RETURNED", timestamp: new Date(), updatedBy: adminId as any, notes: `Return ${r.rmaNumber} received` });
        await order.save(session ? { session } : undefined);
      }
      await NotificationService.notify("RETURN_UPDATE", { userId: String(r.userId), orderNumber: r.orderNumber, message: `Return ${r.rmaNumber} received. Refund will follow.`, link: `/orders/${r.orderNumber}` });
      return { request: r.toObject(), duplicate: false };
    });
  }

  /** Trigger provider refund for a received return. Idempotent per return. */
  static async refund(id: string, adminId: string) {
    await connectDB();
    const r: any = await ReturnRequest.findById(id);
    if (!r) throw new AppError("Return not found", 404, "NOT_FOUND");
    if (r.refund.status === "COMPLETED") return { request: r.toObject(), duplicate: true };
    if (r.status !== "RECEIVED") throw new AppError(`Refund requires RECEIVED status (current: ${r.status})`, 400, "INVALID_STATUS");

    const order: any = await Order.findById(r.orderId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    const payment: any = await Payment.findOne({ orderId: order._id });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");

    const amount = round(r.items.reduce((s: number, it: any) => s + it.refundAmount, 0));
    if (amount <= 0) throw new AppError("Nothing to refund", 400, "INVALID_AMOUNT");

    r.refund.status = "PROCESSING";
    r.refund.initiatedAt = new Date();
    await r.save();

    try {
      const provider = getPaymentProvider(payment.provider);
      const out = await provider.refundPayment({ paymentId: payment.paymentId, orderId: String(order._id), amount, reason: `Return ${r.rmaNumber}` });
      r.refund.status = "COMPLETED";
      r.refund.refundId = out.refundId;
      r.refund.completedAt = new Date();
      r.status = "REFUNDED";
      r.resolvedAt = new Date();
      await r.save();

      await withTransaction(async (session) => {
        const o: any = await Order.findById(order._id, null, session ? { session } : undefined);
        if (o) {
          if (canTransition(o.orderStatus, "REFUND_PENDING")) {
            o.orderStatus = "REFUND_PENDING";
            o.statusHistory.push({ status: "REFUND_PENDING", timestamp: new Date(), updatedBy: adminId as any, notes: `Refund ${out.refundId}` });
            await o.save(session ? { session } : undefined);
          }
          if (canTransition(o.orderStatus, "REFUNDED")) {
            o.orderStatus = "REFUNDED";
            o.statusHistory.push({ status: "REFUNDED", timestamp: new Date(), updatedBy: adminId as any, notes: `Refund completed ${out.refundId}` });
            await o.save(session ? { session } : undefined);
          }
        }
      }).catch(() => {});

      await NotificationService.notify("REFUND_COMPLETED", { userId: String(r.userId), orderNumber: r.orderNumber, amount });
      await AuditLog.create({ admin: adminId as any, action: "REFUND_CREATED", entity: "ReturnRequest", entityId: r.rmaNumber, newValue: { amount, refundId: out.refundId } as any, timestamp: new Date() }).catch(() => {});
      const fresh: any = await ReturnRequest.findById(id).lean();
      return { request: fresh, duplicate: false };
    } catch (e: any) {
      r.refund.status = "FAILED";
      r.refund.failureReason = String(e?.message || e).slice(0, 500);
      await r.save();
      throw new AppError(`Refund failed: ${e?.message || e}`, 502, "REFUND_FAILED");
    }
  }

  static async customerCancel(returnId: string, userId: string) {
    await connectDB();
    const r: any = await ReturnRequest.findOne({ _id: returnId, userId });
    if (!r) throw new AppError("Return not found", 404, "NOT_FOUND");
    if (r.status !== "REQUESTED") throw new AppError(`Cannot cancel return in status ${r.status}`, 400, "INVALID_STATUS");
    r.status = "CANCELLED";
    r.resolvedAt = new Date();
    await r.save();
    // Order back to DELIVERED if it was moved to RETURN_REQUESTED by this request
    const order: any = await Order.findById(r.orderId);
    if (order && order.orderStatus === "RETURN_REQUESTED") {
      const other: any = await ReturnRequest.findOne({ orderId: order._id, status: "REQUESTED", _id: { $ne: r._id } }).lean();
      if (!other) {
        order.orderStatus = "DELIVERED";
        order.statusHistory.push({ status: "DELIVERED", timestamp: new Date(), notes: `Return ${r.rmaNumber} cancelled by customer` });
        await order.save();
      }
    }
    return r.toObject();
  }
}
