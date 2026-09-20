import crypto from "crypto";
import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentInitiationResult,
  VerifyPaymentInput,
  PaymentVerificationResult,
  WebhookResult,
  RefundInput,
  RefundResult,
  PaymentStatusResult,
  ProviderType,
} from "./payment.interface";
import { Payment } from "@/models/Payment";
import { Order } from "@/models/Order";
import { connectDB } from "@/lib/db";
import { withTransaction } from "@/lib/transactions";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

/* ------------------------------------------------------------------ */
/* PhonePe PG v1 (salt-based) helpers — verified against official docs */
/*  X-VERIFY = hex(SHA256(base64Body + endpoint + saltKey)) + ### + idx  */
/*  pay:      POST {host}/pg/v1/pay  body {request: base64}              */
/*  status:   GET  {host}/pg/v1/status/{mid}/{mtxn}  (empty base64 part) */
/*  callback: POST {response: base64}  X-VERIFY over base64+salt         */
/* ------------------------------------------------------------------ */

function phonePeConfig() {
  const merchantId = process.env.PHONEPE_MERCHANT_ID || "";
  const saltKey = process.env.PHONEPE_SALT_KEY || "";
  const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
  const host = (process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox").replace(/\/$/, "");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return { merchantId, saltKey, saltIndex, host, appUrl };
}

export function buildPayChecksum(base64Payload: string, saltKey: string, saltIndex: string): string {
  const hash = crypto.createHash("sha256").update(base64Payload + "/pg/v1/pay" + saltKey).digest("hex");
  return `${hash}###${saltIndex}`;
}

export function buildStatusChecksum(merchantId: string, merchantTransactionId: string, saltKey: string, saltIndex: string): string {
  const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const hash = crypto.createHash("sha256").update(endpoint + saltKey).digest("hex");
  return `${hash}###${saltIndex}`;
}

export function buildCallbackChecksum(base64Response: string, saltKey: string, saltIndex: string): string {
  const hash = crypto.createHash("sha256").update(base64Response + saltKey).digest("hex");
  return `${hash}###${saltIndex}`;
}

export function verifyCallbackChecksum(base64Response: string, received: string, saltKey: string, saltIndex: string): boolean {
  if (!received) return false;
  const expected = buildCallbackChecksum(base64Response, saltKey, saltIndex);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** merchantTransactionId: <=35 chars, alphanumeric. */
export function newMerchantTransactionId(orderNumber: string): string {
  const rand = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
  const clean = orderNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(-12);
  return `M2S${clean}${rand}`.replace(/[^A-Z0-9]/g, "").slice(0, 35);
}

type FetchFn = typeof fetch;

export class PhonePeProvider extends PaymentProvider {
  readonly name: ProviderType = "PHONEPE";
  private fetchFn: FetchFn;

  constructor(fetchFn?: FetchFn) {
    super();
    this.fetchFn = fetchFn || fetch;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    await connectDB();
    const { merchantId, saltKey, saltIndex, host, appUrl } = phonePeConfig();
    if (!merchantId || !saltKey) throw new AppError("PhonePe is not configured", 500, "PROVIDER_NOT_CONFIGURED");

    const order: any = await Order.findById(input.orderId).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (String((order.paymentInfo as any)?.method) !== "PHONEPE") {
      throw new AppError("Order is not a PhonePe order", 400, "PROVIDER_MISMATCH");
    }

    // Idempotent: reuse existing non-terminal payment for this order
    const existing: any = await Payment.findOne({ orderId: order._id }).lean();
    if (existing && ["PAID", "AUTHORIZED"].includes(existing.status)) {
      throw new AppError("Payment already completed for this order", 409, "DUPLICATE");
    }

    const merchantTransactionId = newMerchantTransactionId(order.orderNumber);
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amountPaise = Math.round(input.amount * 100);
    if (amountPaise < 100) throw new AppError("Amount must be at least ₹1", 400, "INVALID_AMOUNT");
// Replace the current payload block with sanitized URLs:
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/+$/, "");

const payload = {
  merchantId,
  merchantTransactionId,
  merchantUserId: String(order.userId || "GUEST_USER").slice(0, 36),
  amount: amountPaise,
  redirectUrl: `${baseUrl}/api/payments/phonepe/callback?mtxn=${merchantTransactionId}`,
  redirectMode: "REDIRECT",
  callbackUrl: `${baseUrl}/api/payments/phonepe/webhook`,
  mobileNumber: String(order.shippingAddress?.phone || "9999999999").replace(/[^0-9]/g, "").slice(-10),
  paymentInstrument: { type: "PAY_PAGE" },
};

    const base64Payload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const checksum = buildPayChecksum(base64Payload, saltKey, saltIndex);

    let redirectUrl: string;
    try {
      const res = await this.fetchFn(`${host}/pg/v1/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-VERIFY": checksum, accept: "application/json" },
        body: JSON.stringify({ request: base64Payload }),
      });
      const data: any = await res.json();
      if (!data?.success || !data?.data?.instrumentResponse?.redirectInfo?.url) {
        logger.error("PhonePe pay rejected", "payment", { code: data?.code, message: data?.message });
        throw new AppError(data?.message || "PhonePe failed to initiate payment", 502, "PROVIDER_ERROR");
      }
      redirectUrl = data.data.instrumentResponse.redirectInfo.url;
    } catch (e: any) {
      if (e instanceof AppError) throw e;
      logger.error("PhonePe pay network error", "payment", { error: String(e?.message || e) });
      throw new AppError("Payment gateway unreachable", 502, "PROVIDER_UNREACHABLE");
    }

    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          paymentId,
          provider: "PHONEPE",
          merchantTransactionId,
          amount: input.amount,
          currency: input.currency || "INR",
          status: "PENDING",
          metadata: { ...(input.metadata || {}), idempotencyKey: input.idempotencyKey, orderNumber: order.orderNumber },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info("PhonePe payment initiated", "payment", { paymentId, merchantTransactionId });
    return { paymentId, providerPaymentId: merchantTransactionId, redirectUrl, status: "PENDING" };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    await connectDB();
    const payment: any = await Payment.findOne({ paymentId: input.paymentId }).lean();
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    try {
      const live = await this.getPaymentStatus(payment.merchantTransactionId);
      return { success: live.status === "PAID", status: live.status, transactionId: live.providerTransactionId, amount: payment.amount };
    } catch {
      return { success: payment.status === "PAID", status: payment.status, amount: payment.amount };
    }
  }

  async handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult> {
    const { saltKey, saltIndex } = phonePeConfig();
    const signature = headers["x-verify"] || headers["X-VERIFY"] || headers["X-Verify"] || "";
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new AppError("Invalid webhook body", 400, "WEBHOOK_INVALID");
    }
    // New event-style callbacks: { type, payload: {...} } ; legacy: { response: base64 }
    if (parsed && typeof parsed === "object" && "response" in parsed && typeof parsed.response === "string") {
      if (!verifyCallbackChecksum(parsed.response, signature, saltKey, saltIndex)) {
        throw new AppError("Invalid webhook signature", 401, "SIGNATURE_ERROR");
      }
      const decoded = JSON.parse(Buffer.from(parsed.response, "base64").toString("utf8"));
      return this.applyStatus(decoded.data?.merchantTransactionId, decoded, signature, rawBody);
    }
    // Event callbacks carry their own auth (username/password per new SDK docs).
    // Without configured credentials we do NOT trust the body — require status re-check.
    const merchantTransactionId: string | undefined =
      parsed?.payload?.merchantTransactionId || parsed?.merchantTransactionId;
    if (!merchantTransactionId) throw new AppError("Invalid webhook body", 400, "WEBHOOK_INVALID");
    let live: any = null;
    try {
      live = await this.getPaymentStatus(merchantTransactionId);
    } catch {
      // Provider temporarily unreachable — return 500 so PhonePe retries later
      // instead of permanently rejecting the webhook
      logger.warn("Provider unreachable during webhook verification, will retry", "payment", { merchantTransactionId });
      throw new AppError("Provider temporarily unreachable, will retry", 503, "PROVIDER_UNREACHABLE");
    }
    return this.applyStatus(merchantTransactionId, { code: live.status === "PAID" ? "PAYMENT_SUCCESS" : "PAYMENT_ERROR", data: live }, signature, rawBody);
  }

  private async applyStatus(merchantTransactionId: string, decoded: any, signature: string, rawBody: string): Promise<WebhookResult> {
    await connectDB();
    const payment: any = await Payment.findOne({ merchantTransactionId });
    if (!payment) {
      logger.warn("Webhook for unknown transaction", "payment", { merchantTransactionId });
      throw new AppError("Payment not found", 404, "NOT_FOUND");
    }

    // Fast-path: already terminally processed and logged
    const alreadyLogged = payment.rawWebhookLogs?.some((l: any) => l.signature === signature && l.processed);
    if ((payment.status === "PAID" && alreadyLogged) || (payment.status === "PAID" && decoded?.code !== "PAYMENT_SUCCESS" && decoded?.success !== true && decoded?.data?.state !== "COMPLETED")) {
      // Still record the delivery for audit, then ACK without state change.
      payment.rawWebhookLogs.push({
        eventType: decoded?.code || decoded?.event || "WEBHOOK",
        rawPayload: (() => { try { return JSON.parse(rawBody); } catch { return { raw: rawBody.slice(0, 2000) }; } })(),
        signature,
        verified: true,
        processed: true,
        processedAt: new Date(),
      });
      await payment.save();
      return { success: true, orderStatusUpdate: false, paymentStatus: "PAID", merchantTransactionId };
    }

    const code = decoded?.code || decoded?.data?.state;
    const success = code === "PAYMENT_SUCCESS" || code === "COMPLETED" || decoded?.success === true;
    const { PaymentService } = await import("./payment.service");

    if (success) {
      // Record provider txn id first (does not flip status — confirmPaid owns that transition)
      if (!payment.providerTransactionId) {
        payment.providerTransactionId = decoded?.data?.transactionId || decoded?.data?.providerTransactionId;
      }
      payment.rawWebhookLogs.push({
        eventType: decoded?.code || decoded?.event || "WEBHOOK",
        rawPayload: (() => { try { return JSON.parse(rawBody); } catch { return { raw: rawBody.slice(0, 2000) }; } })(),
        signature,
        verified: true,
        processed: false,
      });
      await payment.save();
      const out: any = await PaymentService.confirmPaid(payment.merchantTransactionId, "webhook");
      await Payment.updateOne(
        { merchantTransactionId },
        { $set: { "rawWebhookLogs.$[l].processed": true, "rawWebhookLogs.$[l].processedAt": new Date() } },
        { arrayFilters: [{ "l.signature": signature }] }
      ).catch(() => {});
      return { success: true, orderStatusUpdate: !out?.duplicate, paymentStatus: "PAID", merchantTransactionId };
    }

    const nextStatus = code === "PAYMENT_PENDING" || code === "PENDING" ? "PENDING" : "FAILED";
    payment.rawWebhookLogs.push({
      eventType: decoded?.code || decoded?.event || "WEBHOOK",
      rawPayload: (() => { try { return JSON.parse(rawBody); } catch { return { raw: rawBody.slice(0, 2000) }; } })(),
      signature,
      verified: true,
      processed: true,
      processedAt: new Date(),
    });
    await payment.save();
    if (nextStatus === "FAILED") {
      await PaymentService.markFailed(payment.merchantTransactionId, "webhook-failed").catch(() => {});
    } else {
      await Payment.updateOne({ merchantTransactionId, status: { $nin: ["PAID", "FAILED", "CANCELLED"] } }, { $set: { status: "PENDING" } }).catch(() => {});
    }
    return { success: true, orderStatusUpdate: true, paymentStatus: nextStatus, merchantTransactionId };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    await connectDB();
    const { merchantId, saltKey, saltIndex, host } = phonePeConfig();
    const payment: any = await Payment.findOne({ paymentId: input.paymentId });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) {
      throw new AppError(`Cannot refund payment in status ${payment.status}`, 400, "REFUND_NOT_ALLOWED");
    }
    const already = Number(payment.refundDetails?.amount || 0);
    if (already + input.amount > payment.amount + 1e-9) {
      throw new AppError("Refund amount exceeds captured amount", 400, "REFUND_EXCEEDS");
    }

    const merchantUserId = String((await Order.findById(payment.orderId).lean() as any)?.userId || "").slice(0, 36);
    const refundPayload = {
      merchantId,
      merchantUserId,
      originalTransactionId: payment.merchantTransactionId,
      merchantTransactionId: `RF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 35),
      amount: Math.round(input.amount * 100),
      paymentState: "COMPLETED",
    };
    const base64Payload = Buffer.from(JSON.stringify(refundPayload), "utf8").toString("base64");
    const hash = crypto.createHash("sha256").update(base64Payload + "/pg/v1/refund" + saltKey).digest("hex");
    const checksum = `${hash}###${saltIndex}`;

    try {
      const res = await this.fetchFn(`${host}/pg/v1/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-VERIFY": checksum, accept: "application/json" },
        body: JSON.stringify({ request: base64Payload }),
      });
      const data: any = await res.json();
      if (!data?.success) {
        throw new AppError(data?.message || "Refund rejected by provider", 502, "PROVIDER_ERROR");
      }
      const refundId = data?.data?.merchantTransactionId || refundPayload.merchantTransactionId;
      payment.refundDetails = {
        refundId,
        amount: already + input.amount,
        status: "REFUND_PENDING",
        initiatedAt: payment.refundDetails?.initiatedAt || new Date(),
      };
      await payment.save();
      return { refundId, status: "PENDING", amount: input.amount };
    } catch (e: any) {
      if (e instanceof AppError) throw e;
      throw new AppError("Refund gateway unreachable", 502, "PROVIDER_UNREACHABLE");
    }
  }

  async confirmRefund(refundTransactionId: string): Promise<{ status: string }> {
    await connectDB();
    const payment: any = await Payment.findOne({ "refundDetails.refundId": refundTransactionId });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") {
      return { status: payment.status };
    }
    // Re-verify with provider status API using original transaction
    const live = await this.getPaymentStatus(payment.merchantTransactionId);
    if (live.status === "PAID") {
      const full = (payment.refundDetails?.amount || 0) >= payment.amount - 1e-9;
      payment.status = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
      payment.refundDetails = {
        ...payment.refundDetails,
        status: payment.status,
        completedAt: new Date(),
      };
      await payment.save();
      return { status: payment.status };
    }
    return { status: "REFUND_PENDING" };
  }

  async getPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResult> {
    const { merchantId, saltKey, saltIndex, host } = phonePeConfig();
    const checksum = buildStatusChecksum(merchantId, merchantTransactionId, saltKey, saltIndex);
    let data: any;
    try {
      const res = await this.fetchFn(`${host}/pg/v1/status/${merchantId}/${merchantTransactionId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-VERIFY": checksum, "X-MERCHANT-ID": merchantId, accept: "application/json" },
      });
      data = await res.json();
    } catch (e: any) {
      throw new AppError("Status check unreachable", 502, "PROVIDER_UNREACHABLE");
    }
    // PG v1 status codes: PAYMENT_SUCCESS / PAYMENT_PENDING / PAYMENT_ERROR
    const code = data?.code;
    const state = data?.data?.state;
    if (code === "PAYMENT_SUCCESS" || state === "COMPLETED") {
      return { status: "PAID", amount: (data?.data?.amount || 0) / 100, providerTransactionId: data?.data?.transactionId, raw: data };
    }
    if (code === "PAYMENT_PENDING" || state === "PENDING") {
      return { status: "PENDING", amount: (data?.data?.amount || 0) / 100, raw: data };
    }
    if (code === "PAYMENT_ERROR" || state === "FAILED") {
      return { status: "FAILED", amount: (data?.data?.amount || 0) / 100, raw: data };
    }
    throw new AppError(`Unknown provider status: ${code || state}`, 502, "PROVIDER_ERROR");
  }
}

export class CODProvider extends PaymentProvider {
  readonly name: ProviderType = "COD";

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    await connectDB();
    const order: any = await Order.findById(input.orderId).lean();
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    const { ShippingService } = await import("../shipping.service");
    const check = await ShippingService.checkCOD(input.amount, order.shippingAddress?.pincode || "");
    if (!check.eligible) throw new AppError(check.reason || "COD not available", 400, "COD_UNAVAILABLE");

    const paymentId = `COD_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const merchantTransactionId = `COD${Date.now().toString(36).toUpperCase()}`.slice(0, 35);
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          paymentId,
          provider: "COD",
          merchantTransactionId,
          amount: input.amount,
          currency: "INR",
          status: "PENDING",
          metadata: { ...(input.metadata || {}), codFee: check.fee },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { paymentId, providerPaymentId: merchantTransactionId, status: "PENDING" };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    await connectDB();
    const payment: any = await Payment.findOne({ paymentId: input.paymentId }).lean();
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    return { success: payment.status === "PAID", status: payment.status, amount: payment.amount };
  }

  async handleWebhook(): Promise<WebhookResult> {
    throw new AppError("COD has no webhooks", 400, "NO_WEBHOOK");
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    // COD refunds are handled offline (cash/bank). Record only.
    await connectDB();
    const payment: any = await Payment.findOne({ paymentId: input.paymentId });
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    const refundId = `CODRF_${Date.now()}`;
    const already = Number(payment.refundDetails?.amount || 0);
    const full = already + input.amount >= payment.amount - 1e-9;
    payment.status = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
    payment.refundDetails = { refundId, amount: already + input.amount, status: payment.status, initiatedAt: new Date(), completedAt: new Date() };
    await payment.save();
    return { refundId, status: "COMPLETED", amount: input.amount };
  }

  async getPaymentStatus(): Promise<PaymentStatusResult> {
    throw new AppError("COD has no provider status; use order status", 400, "NO_PROVIDER_STATUS");
  }
}

export function getPaymentProvider(type: string, fetchFn?: FetchFn): PaymentProvider {
  switch (type) {
    case "PHONEPE":
      return new PhonePeProvider(fetchFn);
    case "COD":
      return new CODProvider();
    default:
      throw new AppError(`Unknown payment provider: ${type}`, 400, "UNKNOWN_PROVIDER");
  }
}
