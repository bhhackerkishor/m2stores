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
  static async initiate(orderNumber: string, idempotencyKey?: string, userId?: string) {
    await connectDB();
    // When called on behalf of a customer, ownership is part of the filter (BOLA guard).
    const order: any = await Order.findOne({ orderNumber, ...(userId ? { userId } : {}) }).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (["DELIVERED", "CANCELLED", "REFUNDED", "PAYMENT_RECEIVED"].includes(order.orderStatus)) {
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
   *
   * FIX (FINDING-01): Accepts optional verifiedAmount (paise) from provider.
   * Compares against payment.amount (rupees) to prevent amount tampering.
   *
   * FIX (FINDING-02): If order is already CANCELLED/REFUNDED, transitions to
   * PAYMENT_RECEIVED and auto-refunds instead of creating inconsistent state.
   *
   * FIX (FINDING-03): If inventory reservation expired during payment, attempts
   * atomic reacquire. Falls back to PAYMENT_RECEIVED for manual reconciliation.
   *
   * @param preloaded - Optional pre-fetched payment/order to avoid double-read
   *   in webhook path. When provided, the transaction uses these objects directly,
   *   eliminating the race window between the webhook handler's read and this
   *   function's read.
   */
  static async confirmPaid(
    merchantTransactionId: string,
    source: string,
    verifiedAmountPaise?: number,
    preloaded?: { payment?: any; order?: any; webhookLog?: { signature: string; rawBody: string; eventType: string } }
  ) {
    await connectDB();
    const payment: any = preloaded?.payment ?? await Payment.findOne({ merchantTransactionId });
    if (!payment) {
      logger.warn("confirmPaid called for unknown transaction", "payment", { merchantTransactionId, source });
      throw new AppError("Payment not found", 404, "NOT_FOUND");
    }
    if (payment.status === "PAID") {
      // Still mark webhook log as processed if provided (idempotent)
      if (preloaded?.webhookLog) {
        await Payment.updateOne(
          { merchantTransactionId },
          { $set: { "rawWebhookLogs.$[l].processed": true, "rawWebhookLogs.$[l].processedAt": new Date() } },
          { arrayFilters: [{ "l.signature": preloaded.webhookLog.signature }] }
        ).catch(() => {});
      }
      logger.info("Duplicate confirmPaid ignored", "payment", { merchantTransactionId, source });
      return { payment: payment.toObject(), duplicate: true };
    }

    // ── FINDING-01: Verify payment amount from provider ──
    // verifiedAmountPaise is in paise (from PhonePe API); payment.amount is in rupees
    if (verifiedAmountPaise !== undefined && payment.provider === "PHONEPE") {
      const expectedPaise = Math.round(payment.amount * 100);
      if (verifiedAmountPaise !== expectedPaise) {
        logger.error("PAYMENT_AMOUNT_MISMATCH", "payment", {
          merchantTransactionId,
          providerPaise: verifiedAmountPaise,
          expectedPaise,
          paymentAmountRupees: payment.amount,
          source,
        });
        throw new AppError(
          `Payment amount mismatch: expected ₹${payment.amount} (₹${expectedPaise}p), got ₹${verifiedAmountPaise / 100} (${verifiedAmountPaise}p)`,
          400,
          "AMOUNT_MISMATCH"
        );
      }
    }

    let latePaymentRefund: { method: string; paymentId: string; orderId: string; amount: number; reason: string } | null = null;

    const result = await withTransaction(async (session) => {
      const order: any = await Order.findById(payment.orderId, null, session ? { session } : undefined);
      if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
      const previousOrderStatus: string = order.orderStatus;

      // ── FINDING-02: Late payment after cancellation/refund ──
      if (["CANCELLED", "REFUNDED", "RETURNED"].includes(order.orderStatus)) {
        payment.status = "PAID";
        payment.refundDetails = {
          refundId: `LATE_${merchantTransactionId}`,
          amount: order.pricingSnapshot.grandTotal,
          status: "PENDING",
          initiatedAt: new Date(),
        };
        await payment.save(session ? { session } : undefined);

        order.orderStatus = "PAYMENT_RECEIVED";
        order.statusHistory.push({
          status: "PAYMENT_RECEIVED",
          timestamp: new Date(),
          notes: `Payment confirmed (INR ${order.pricingSnapshot.grandTotal}) but order was ${previousOrderStatus}. Auto-refund will be initiated. (${source})`,
        });
        await order.save(session ? { session } : undefined);

        // Queue refund to run AFTER transaction commits (provider checks DB for PAID status)
        latePaymentRefund = {
          method: order.paymentInfo.method,
          paymentId: payment.paymentId,
          orderId: String(order._id),
          amount: order.pricingSnapshot.grandTotal,
          reason: `Late payment received for ${previousOrderStatus} order (${source})`,
        };

        logger.warn("PAYMENT_RECEIVED_LATE", "payment", {
          merchantTransactionId,
          orderNumber: order.orderNumber,
          previousOrderStatus,
          source,
        });
        return { payment: payment.toObject(), duplicate: false, reconciliation: true, latePaymentRefund };
      }

      // ── Normal path: mark payment PAID ──
      payment.status = "PAID";
      await payment.save(session ? { session } : undefined);

      if (order.paymentInfo?.status !== "PAID") {
        order.paymentInfo = { ...(order.paymentInfo || {}), status: "PAID", paymentId: payment._id };
        if (order.orderStatus === "PENDING_PAYMENT") {
          order.orderStatus = "CONFIRMED";
          order.statusHistory.push({ status: "CONFIRMED", timestamp: new Date(), notes: `Payment confirmed (${source})` });
        }
        await order.save(session ? { session } : undefined);
      }

      // ── FINDING-03: Commit reserved inventory with expired-reservation recovery ──
      let inventoryFullyCommitted = true;
      for (const item of order.items) {
        try {
          await InventoryService.commit({
            productId: String(item.productId),
            sku: item.sku,
            quantity: item.quantity,
            orderId: String(order._id),
            operationId: `COMMIT_${order.orderNumber}_${String(item.sku).toUpperCase()}`,
            reason: `Payment confirmed ${order.orderNumber} (${source})`,
          });
        } catch (e: any) {
          const isCommitFailure =
            e?.code === "COMMIT_FAILED" || e?.message?.includes("Cannot commit");
          if (!isCommitFailure) throw e;

          // Reservation expired — attempt atomic reacquire
          logger.warn("RESERVATION_EXPIRED_REACQUIRE_ATTEMPT", "payment", {
            merchantTransactionId,
            sku: item.sku,
            source,
          });
          try {
            await InventoryService.reserve({
              productId: String(item.productId),
              sku: item.sku,
              quantity: item.quantity,
              orderId: String(order._id),
              orderItemId: item._id || `${String(order._id)}_${item.sku}`,
              operationId: `REACQ_${order.orderNumber}_${String(item.sku).toUpperCase()}`,
              reason: `Reacquire stock for paid order ${order.orderNumber} (${source})`,
            });
            await InventoryService.commit({
              productId: String(item.productId),
              sku: item.sku,
              quantity: item.quantity,
              orderId: String(order._id),
              operationId: `COMMIT_${order.orderNumber}_${String(item.sku).toUpperCase()}`,
              reason: `Payment confirmed after reacquire ${order.orderNumber} (${source})`,
            });
          } catch (reacquireError: any) {
            // Stock unavailable — order is paid but cannot be fulfilled immediately
            inventoryFullyCommitted = false;
            logger.error("PAYMENT_RECEIVED_INVENTORY_UNAVAILABLE", "payment", {
              merchantTransactionId,
              orderNumber: order.orderNumber,
              sku: item.sku,
              error: String(reacquireError?.message || reacquireError),
              source,
            });

            // Only transition to PAYMENT_RECEIVED if still on CONFIRMED path
            if (order.orderStatus === "CONFIRMED") {
              order.orderStatus = "PAYMENT_RECEIVED";
              order.statusHistory.push({
                status: "PAYMENT_RECEIVED",
                timestamp: new Date(),
                notes: `Payment confirmed but inventory unavailable for SKU ${item.sku}. Admin must allocate stock or initiate refund. (${source})`,
              });
              await order.save(session ? { session } : undefined);
            }
          }
        }
      }

      logger.info("Payment confirmed", "payment", {
        merchantTransactionId,
        source,
        inventoryFullyCommitted,
        orderStatus: order.orderStatus,
      });

      // Mark webhook log as processed atomically inside the transaction
      if (preloaded?.webhookLog) {
        await Payment.updateOne(
          { merchantTransactionId },
          { $set: { "rawWebhookLogs.$[l].processed": true, "rawWebhookLogs.$[l].processedAt": new Date() } },
          { arrayFilters: [{ "l.signature": preloaded.webhookLog.signature }], session: session as any }
        ).catch(() => {});
      }

      const doneOrder: any = await Order.findById(payment.orderId).lean().catch(() => null);
      if (doneOrder) {
        const { NotificationService } = await import("../notification/notification.service");
        await NotificationService.notify("PAYMENT_SUCCESS", {
          userId: String(doneOrder.userId),
          orderNumber: doneOrder.orderNumber,
          total: `₹${doneOrder.pricingSnapshot?.grandTotal}`,
        });
      }
      return { payment: payment.toObject(), duplicate: false, latePaymentRefund };
    });

    // ── FINDING-02: Execute refund AFTER transaction commits ──
    // The provider checks DB for PAID status, which is only visible after tx commit.
    if (result.latePaymentRefund) {
      const r = result.latePaymentRefund;
      try {
        const provider = getPaymentProvider(r.method);
        await provider.refundPayment({
          paymentId: r.paymentId,
          orderId: r.orderId,
          amount: r.amount,
          reason: r.reason,
        });
        await Payment.findOneAndUpdate(
          { merchantTransactionId },
          { $set: { "refundDetails.status": "REFUND_PENDING", "refundDetails.refundId": `LATE_${merchantTransactionId}` } }
        );
        logger.warn("PAYMENT_RECEIVED_LATE_AUTO_REFUND_INITIATED", "payment", { merchantTransactionId, source });
      } catch (e: any) {
        logger.error("PAYMENT_RECEIVED_LATE_REFUND_FAILED", "payment", {
          merchantTransactionId,
          error: String(e?.message || e),
          source,
        });
        await Payment.findOneAndUpdate(
          { merchantTransactionId },
          { $set: { "refundDetails.status": "FAILED" } }
        );
        await Order.findOneAndUpdate(
          { _id: r.orderId },
          { $push: { statusHistory: { status: "PAYMENT_RECEIVED", timestamp: new Date(), notes: `Auto-refund failed: ${String(e?.message || e)}. Manual intervention required.` } } }
        );
      }
    }
    return result;
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
        order.statusHistory.push({ status: order.orderStatus, timestamp: new Date(), notes: `Payment failed (${source}). Order retained for retry.` });
        await order.save(session ? { session } : undefined);
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
      await this.confirmPaid(payment.merchantTransactionId, "sync", Math.round((live.amount || 0) * 100));
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
