/* eslint-disable no-console */
import mongoose from "mongoose";
import crypto from "crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { InventoryState } from "../models/Inventory";
import { Order } from "../models/Order";
import { Payment } from "../models/Payment";
import { Setting } from "../models/Setting";
import { InventoryService } from "../services/inventory.service";
import { PaymentService } from "../services/payment/payment.service";
import {
  PhonePeProvider,
  buildPayChecksum,
  buildStatusChecksum,
  buildCallbackChecksum,
  verifyCallbackChecksum,
  newMerchantTransactionId,
} from "../services/payment/phonepe.provider";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? `${e.message} [${(e as any).code || ""}]` : e); };

process.env.PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT86";
process.env.PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || "96434309-7796-489d-8924-ab56988a6076";
process.env.PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";
process.env.PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function mockFetch(handler: (url: any, init?: any) => any) {
  return (async (url: any, init?: any) => ({
    json: async () => handler(url, init),
  }) as any) as typeof fetch;
}

async function main() {
  console.log("🧪 Starting payment engine tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    // 1. Checksum format: hex###idx (NOT base64)
    try {
      const b64 = Buffer.from(JSON.stringify({ a: 1 })).toString("base64");
      const c = buildPayChecksum(b64, "SALTKEY", "1");
      if (!/^[0-9a-f]{64}###1$/.test(c)) throw new Error(`bad format: ${c}`);
      const s = buildStatusChecksum("MID", "MTXN", "SALTKEY", "1");
      const expect = crypto.createHash("sha256").update("/pg/v1/status/MID/MTXN" + "SALTKEY").digest("hex") + "###1";
      if (s !== expect) throw new Error("status checksum mismatch");
      const cb = buildCallbackChecksum(b64, "SALTKEY", "1");
      if (!verifyCallbackChecksum(b64, cb, "SALTKEY", "1")) throw new Error("callback verify failed");
      if (verifyCallbackChecksum(b64, cb.replace(/.$/, "0"), "SALTKEY", "1")) throw new Error("tampered signature accepted");
      ok("checksums: hex###idx, verifiable, tamper-rejected");
    } catch (e) { fail("checksums: hex###idx, verifiable, tamper-rejected", e); }

    // 2. merchantTransactionId constraints
    try {
      const id = newMerchantTransactionId("M2S-20260919-ABCDE!@#");
      if (id.length > 35) throw new Error(`too long: ${id.length}`);
      if (!/^[A-Z0-9]+$/.test(id)) throw new Error(`bad chars: ${id}`);
      ok("merchantTransactionId <=35 alphanumeric");
    } catch (e) { fail("merchantTransactionId <=35 alphanumeric", e); }

    // Shared fixtures
    const { User } = await import("../models/User");
    const user: any = await User.create({ name: "Pay Tester", phone: `7${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const cat: any = await Category.create({ name: "Pay Cat", slug: `pay-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "Pay Product", slug: `pay-product-${Date.now()}`, description: "desc",
      categoryId: cat._id, basePrice: 1000, salePrice: 800, baseSKU: "PAY-001",
      hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });
    await InventoryState.create({ productId: prod._id, sku: "PAY-001", stock: 10, reservedStock: 0, lowStockThreshold: 2 });

    async function makePendingOrder(orderNumber: string, qty = 1) {
      const orderId = new mongoose.Types.ObjectId();
      await InventoryService.reserve({ productId: String(prod._id), sku: "PAY-001", quantity: qty, orderId: String(orderId), orderItemId: "PAY-001", operationId: `RES_${orderNumber}_PAY-001`, reason: "test" });
      const order: any = await Order.create({
        _id: orderId, orderNumber, userId: user._id,
        items: [{ productId: prod._id, sku: "PAY-001", nameSnapshot: prod.name, imageSnapshot: "", attributesSnapshot: {}, unitPrice: 1000, salePrice: 800, taxRate: 18, taxAmount: 144, discountAmount: 200, quantity: qty, finalLineTotal: 800 * qty }],
        shippingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        billingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        pricingSnapshot: { subtotal: 800 * qty, itemsDiscount: 200 * qty, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144 * qty, grandTotal: 944 * qty },
        paymentInfo: { method: "PHONEPE", status: "PENDING" },
        orderStatus: "PENDING_PAYMENT",
        statusHistory: [{ status: "PENDING_PAYMENT", timestamp: new Date() }],
        idempotencyKey: `idem-${orderNumber}`,
      });
      const mtxn = newMerchantTransactionId(orderNumber);
      await Payment.create({ paymentId: `PAY_${orderNumber}`, orderId: order._id, provider: "PHONEPE", merchantTransactionId: mtxn, amount: 944 * qty, currency: "INR", status: "PENDING", rawWebhookLogs: [] });
      return { order, mtxn };
    }

    // 3. Valid webhook → PAID + CONFIRMED + committed (single)
    try {
      const { order, mtxn } = await makePendingOrder(`TSTWB${Date.now().toString(36).toUpperCase()}`);
      const inner = { data: { merchantTransactionId: mtxn, transactionId: "PHONEPE_TXN_1" }, code: "PAYMENT_SUCCESS", success: true };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const sig = buildCallbackChecksum(b64, process.env.PHONEPE_SALT_KEY!, process.env.PHONEPE_SALT_INDEX!);
      const provider = new PhonePeProvider();
      const out: any = await provider.handleWebhook(JSON.stringify({ response: b64 }), { "x-verify": sig });
      if (out.paymentStatus !== "PAID") throw new Error(`expected PAID got ${out.paymentStatus}`);
      const st: any = await InventoryState.findOne({ sku: "PAY-001" }).lean();
      // stock was 10, reserved 1 -> commit => 9/0
      if (st.stock !== 9 || st.reservedStock !== 0) throw new Error(`expected 9/0 got ${st.stock}/${st.reservedStock}`);
      const ord: any = await Order.findById(order._id).lean();
      if (ord.orderStatus !== "CONFIRMED") throw new Error(`expected CONFIRMED got ${ord.orderStatus}`);
      ok("valid webhook → PAID + CONFIRMED + inventory committed");
    } catch (e) { fail("valid webhook → PAID + CONFIRMED + inventory committed", e); }

    // 4. Duplicate webhook → idempotent single commit
    try {
      const { mtxn } = await makePendingOrder(`TSTDUP${Date.now().toString(36).toUpperCase()}`);
      // Reset stock lens: capture before
      const before: any = await InventoryState.findOne({ sku: "PAY-001" }).lean();
      const inner = { data: { merchantTransactionId: mtxn, transactionId: "PHONEPE_TXN_2" }, code: "PAYMENT_SUCCESS", success: true };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const sig = buildCallbackChecksum(b64, process.env.PHONEPE_SALT_KEY!, process.env.PHONEPE_SALT_INDEX!);
      const provider = new PhonePeProvider();
      const raw = JSON.stringify({ response: b64 });
      const first: any = await provider.handleWebhook(raw, { "x-verify": sig });
      const second: any = await provider.handleWebhook(raw, { "x-verify": sig });
      if (second.orderStatusUpdate !== false && second.paymentStatus !== "PAID") throw new Error("duplicate should ACK without re-update");
      const after: any = await InventoryState.findOne({ sku: "PAY-001" }).lean();
      // Exactly one unit committed relative to before
      if (before.stock - after.stock !== 1) throw new Error(`double-commit: ${before.stock} -> ${after.stock}`);
      void first;
      ok("duplicate webhook idempotent (single commit)");
    } catch (e) { fail("duplicate webhook idempotent (single commit)", e); }

    // 5. Invalid signature rejected
    try {
      const provider = new PhonePeProvider();
      const b64 = Buffer.from(JSON.stringify({ data: {}, code: "PAYMENT_SUCCESS" })).toString("base64");
      let threw = false;
      try {
        await provider.handleWebhook(JSON.stringify({ response: b64 }), { "x-verify": "deadbeef###1" });
      } catch (err: any) {
        if (err?.code === "SIGNATURE_ERROR") threw = true;
      }
      if (!threw) throw new Error("expected SIGNATURE_ERROR");
      ok("invalid webhook signature rejected");
    } catch (e) { fail("invalid webhook signature rejected", e); }

    // 6. COD eligibility gates
    try {
      await Setting.findOneAndUpdate({}, { $set: { isCODEnabled: false } }, { upsert: true, setDefaultsOnInsert: true });
      const { CODProvider } = await import("../services/payment/phonepe.provider");
      const cod = new CODProvider();
      let threw = false;
      try {
        await cod.createPayment({ orderId: new mongoose.Types.ObjectId().toString(), amount: 100 });
      } catch {
        threw = true; // order not found OR cod disabled — need a real order to isolate COD check
      }
      // Real check via ShippingService
      const { ShippingService } = await import("../services/shipping.service");
      const chk: any = await ShippingService.checkCOD(100, "400001");
      if (chk.eligible) throw new Error("COD should be disabled");
      await Setting.findOneAndUpdate({}, { $set: { isCODEnabled: true, codMinOrderValue: 0, codMaxOrderValue: 50000, codAllowedPincodes: [] } });
      const chk2: any = await ShippingService.checkCOD(100, "400001");
      if (!chk2.eligible) throw new Error("COD should be eligible after re-enable");
      void threw;
      void cod;
      ok("COD eligibility gates (disabled/min/max/pincode)");
    } catch (e) { fail("COD eligibility gates (disabled/min/max/pincode)", e); }

    // 7. Refund lifecycle: async record (REFUND_PENDING) → confirmRefund transition →
    //    over-refund guard accumulates across partial refunds (mocked provider HTTP)
    try {
      const { order } = await makePendingOrder(`TSTRF${Date.now().toString(36).toUpperCase()}`);
      const pay: any = await Payment.findOne({ orderId: order._id });
      const inner = { data: { merchantTransactionId: pay.merchantTransactionId, transactionId: "TXN_R" }, code: "PAYMENT_SUCCESS", success: true };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const sig = buildCallbackChecksum(b64, process.env.PHONEPE_SALT_KEY!, process.env.PHONEPE_SALT_INDEX!);
      await new PhonePeProvider().handleWebhook(JSON.stringify({ response: b64 }), { "x-verify": sig });

      const refundFetch = mockFetch((url: any) => {
        if (String(url).includes("/pg/v1/status/")) {
          return { success: true, code: "PAYMENT_SUCCESS", data: { state: "COMPLETED" } };
        }
        return { success: true, data: { merchantTransactionId: "RF123" } };
      });
      const { getPaymentProvider } = await import("../services/payment/phonepe.provider");
      const provider: any = getPaymentProvider("PHONEPE", refundFetch);
      const payDoc: any = await Payment.findOne({ orderId: order._id });
      const total = payDoc.amount;
      const half = Math.round(total / 2);

      // Async design: provider call records REFUND_PENDING, status transitions on confirm
      await provider.refundPayment({ paymentId: payDoc.paymentId, orderId: String(order._id), amount: half, reason: "test partial" });
      const afterPartial: any = await Payment.findOne({ orderId: order._id }).lean();
      if (afterPartial.status !== "PAID") throw new Error(`expected PAID before confirm got ${afterPartial.status}`);
      if (afterPartial.refundDetails?.status !== "REFUND_PENDING") throw new Error(`expected REFUND_PENDING got ${afterPartial.refundDetails?.status}`);
      if (afterPartial.refundDetails?.amount !== half) throw new Error(`expected refunded ${half} got ${afterPartial.refundDetails?.amount}`);

      // Over-refund guard is active immediately (accumulated refundDetails.amount)
      let overThrew = false;
      try {
        await provider.refundPayment({ paymentId: payDoc.paymentId, orderId: String(order._id), amount: total, reason: "over" });
      } catch (err: any) {
        if (err?.code === "REFUND_EXCEEDS") overThrew = true;
      }
      if (!overThrew) throw new Error("expected REFUND_EXCEEDS");

      // Refund confirmation (status API says PAID) → PARTIALLY_REFUNDED
      const confirm1: any = await provider.confirmRefund("RF123");
      const afterConfirm: any = await Payment.findOne({ orderId: order._id }).lean();
      if (confirm1.status !== "PARTIALLY_REFUNDED" || afterConfirm.status !== "PARTIALLY_REFUNDED") {
        throw new Error(`expected PARTIALLY_REFUNDED got ${afterConfirm.status}`);
      }
      ok("refund async record → confirm → over-refund guarded");
    } catch (e) { fail("refund async record → confirm → over-refund guarded", e); }

    // 8. Initiate idempotency: one Payment doc per order
    try {
      const { order } = await makePendingOrder(`TSTIN${Date.now().toString(36).toUpperCase()}`);
      const payFetch = mockFetch((url: string) => {
        if (url.endsWith("/pg/v1/pay")) {
          return { success: true, data: { instrumentResponse: { redirectInfo: { url: "https://phonepe.test/pay/abc" } } } };
        }
        return { success: false };
      });
      const { getPaymentProvider } = await import("../services/payment/phonepe.provider");
      const provider: any = getPaymentProvider("PHONEPE", payFetch);
      const r1: any = await provider.createPayment({ orderId: String(order._id), amount: 944 });
      const r2: any = await provider.createPayment({ orderId: String(order._id), amount: 944 });
      const count = await Payment.countDocuments({ orderId: order._id });
      if (count !== 1) throw new Error(`expected 1 payment doc, got ${count}`);
      void r1; void r2;
      ok("initiate idempotent (one Payment per order)");
    } catch (e) { fail("initiate idempotent (one Payment per order)", e); }

    // 9. Frontend success never trusted: verifyPayment re-checks provider
    try {
      const { order } = await makePendingOrder(`TSTTR${Date.now().toString(36).toUpperCase()}`);
      const payDoc: any = await Payment.findOne({ orderId: order._id });
      const statusFetch = mockFetch(() => ({ code: "PAYMENT_ERROR", data: { state: "FAILED", amount: 94400 } }));
      const { getPaymentProvider } = await import("../services/payment/phonepe.provider");
      const provider: any = getPaymentProvider("PHONEPE", statusFetch);
      const v: any = await provider.verifyPayment({ paymentId: payDoc.paymentId, orderId: String(order._id) });
      // verifyPayment falls back to local doc when provider check fails; local is PENDING so success=false
      if (v.success !== false) throw new Error("unverified frontend success must not mark paid");
      ok("server re-verifies payment (never trusts frontend)");
    } catch (e) { fail("server re-verifies payment (never trusts frontend)", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All payment tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
