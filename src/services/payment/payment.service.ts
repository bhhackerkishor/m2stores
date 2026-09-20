import { connectDB } from "@/lib/db";
import { withTransaction } from "@/lib/transactions";
import { Payment } from "@/models/Payment";
import { Order } from "@/models/Order";
import { InventoryService } from "../inventory.service";
import { getPaymentProvider } from "./phonepe.provider";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Central payment orchestrator. All PhonePe/COD specifics stay inside providers;
 * order + inventory transitions happen here, idempotently.
 */
export class PaymentService {
  /** Idempotent initiate: one Payment doc per order; re-initiate updates it. */
  static async initiate(orderNumber: string, idempotencyKey?: string) {
    await connectDB();
    const order: any = await Order.findOne({ orderNumber }).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.orderStatus)) {
      throw new AppError(`Cannot pay for order in status ${order.orderStatus}`, 400, "INVALID_STATUS");
    }
    const existing: any = await Payment.findOne({ orderId: order._id }).lean();
    if (existing?.status === "PAID") throw new AppError("Payment already completed", 409, "DUPLICATE");

    const provider = getPaymentProvider(order.paymentInfo.method);
    const amount = order.pricingSnapshot.grandTotal;
    const result = await provider.createPayment({
      orderId: String(order._id),
      amount,
      currency: "INR",
      metadata: { orderNumber, idempotencyKey },
      idempotencyKey,
    });
    return { order, payment: await Payment.findOne({ orderId: order._id }).lean(), redirect: result };
  }

  /**
   * Server-side confirm. Re-verifies with the provider first —
   * NEVER trusts frontend success flags.
   */
  static async confirmPaid(merchantTransactionId: string, source: string) {
    await connectDB();
    const payment: any = await Payment.findOne({ merchantTransactionId });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    if (payment.status === "PAID") {
      logger.info("Duplicate confirmPaid ignored", "payment", { merchantTransactionId, source });
      return { payment: payment.toObject(), duplicate: true };
    }

    return withTransaction(async (session) => {
      payment.status = "PAID";
      await payment.save(session ? { session } : undefined);

      const order: any = await Order.findById(payment.orderId, null, session ? { session } : undefined);
      if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

      if (order.paymentInfo?.status !== "PAID") {
        order.paymentInfo = { ...(order.paymentInfo || {}), status: "PAID", paymentId: payment._id };
        if (order.orderStatus === "PENDING_PAYMENT") {
          order.orderStatus = "CONFIRMED";
          order.statusHistory.push({ status: "CONFIRMED", timestamp: new Date(), notes: `Payment confirmed (${source})` });
        }
        await order.save(session ? { session } : undefined);
      }

      // Commit reserved inventory exactly once (idempotent per operationId)
      for (const item of order.items) {
        await InventoryService.commit({
          productId: String(item.productId),
          sku: item.sku,
          quantity: item.quantity,
          orderId: String(order._id),
          operationId: `COMMIT_${order.orderNumber}_${String(item.sku).toUpperCase()}`,
          reason: `Payment confirmed ${order.orderNumber} (${source})`,
        });
      }

      logger.info("Payment confirmed", "payment", { merchantTransactionId, source });
      const doneOrder: any = await Order.findById(payment.orderId).lean().catch(() => null);
      if (doneOrder) {
        const { NotificationService } = await import("../notification/notification.service");
        await NotificationService.notify("PAYMENT_SUCCESS", {
          userId: String(doneOrder.userId),
          orderNumber: doneOrder.orderNumber,
          total: `₹${doneOrder.pricingSnapshot?.grandTotal}`,
        });
      }
      return { payment: payment.toObject(), duplicate: false };
    });
  }

  static async markFailed(merchantTransactionId: string, source: string) {
    await connectDB();
    const payment: any = await Payment.findOne({ merchantTransactionId });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    if (["PAID", "FAILED", "CANCELLED"].includes(payment.status)) {
      return { payment: payment.toObject(), duplicate: true };
    }
    return withTransaction(async (session) => {
      payment.status = "FAILED";
      await payment.save(session ? { session } : undefined);
      const order: any = await Order.findById(payment.orderId, null, session ? { session } : undefined);
      if (order && order.paymentInfo?.status !== "PAID") {
        order.paymentInfo = { ...(order.paymentInfo || {}), status: "FAILED" };
        if (order.orderStatus === "PENDING_PAYMENT") {
          order.orderStatus = "CANCELLED";
          order.statusHistory.push({ status: "CANCELLED", timestamp: new Date(), notes: `Payment failed (${source})` });
        }
        await order.save(session ? { session } : undefined);
        for (const item of order.items) {
          await InventoryService.release({
            productId: String(item.productId),
            sku: item.sku,
            quantity: item.quantity,
            orderId: String(order._id),
            operationId: `REL_${order.orderNumber}_${String(item.sku).toUpperCase()}`,
            reason: `Payment failed ${order.orderNumber}`,
          });
        }
      }
      const failedOrder = await Order.findById(payment.orderId).lean().catch(() => null) as any;
      if (failedOrder) {
        const { NotificationService } = await import("../notification/notification.service");
        await NotificationService.notify("PAYMENT_FAILED", { userId: String(failedOrder.userId), orderNumber: failedOrder.orderNumber });
      }
      return { payment: payment.toObject(), duplicate: false };
    });
  }

  /** Verify with provider, then sync local state. Returns canonical status. */
  static async syncStatus(orderNumber: string) {
    await connectDB();
    const order: any = await Order.findOne({ orderNumber }).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    const payment: any = await Payment.findOne({ orderId: order._id }).lean();
    if (!payment) return { order, payment: null, status: order.paymentInfo?.status || "UNKNOWN" };

    if (payment.provider === "COD") {
      return { order, payment, status: payment.status };
    }
    const provider = getPaymentProvider("PHONEPE");
    let live;
    try {
      live = await provider.getPaymentStatus(payment.merchantTransactionId);
    } catch (e: any) {
      return { order, payment, status: payment.status, providerUnreachable: true };
    }
    if (live.status === "PAID" && payment.status !== "PAID") {
      await this.confirmPaid(payment.merchantTransactionId, "sync");
    } else if (live.status === "FAILED" && !["PAID", "FAILED"].includes(payment.status)) {
      await this.markFailed(payment.merchantTransactionId, "sync");
    }
    const fresh: any = await Payment.findOne({ orderId: order._id }).lean();
    const freshOrder: any = await Order.findById(order._id).lean();
    return { order: freshOrder, payment: fresh, status: fresh.status };
  }

  static async refund(orderNumber: string, amount: number, reason: string) {
    await connectDB();
    const order: any = await Order.findOne({ orderNumber });
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    const payment: any = await Payment.findOne({ orderId: order._id });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    const provider = getPaymentProvider(payment.provider);
    const result = await provider.refundPayment({ paymentId: payment.paymentId, orderId: String(order._id), amount, reason });
    return { payment: await Payment.findById(payment._id).lean(), result };
  }
}
