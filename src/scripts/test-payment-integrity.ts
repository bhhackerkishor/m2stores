/* eslint-disable no-console */
/**
 * P1 Payment Integrity Tests
 * FINDING-01 (amount verification), FINDING-02 (late payment after cancel),
 * FINDING-03 (expired reservation + successful payment).
 */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { InventoryState, InventoryReservation } from "../models/Inventory";
import { Order } from "../models/Order";
import { Payment } from "../models/Payment";
import { InventoryService } from "../services/inventory.service";
import { PaymentService } from "../services/payment/payment.service";
import { newMerchantTransactionId } from "../services/payment/phonepe.provider";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`  PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`  FAIL: ${n}`, e instanceof Error ? `${e.message} [${(e as any).code || ""}]` : e); };

process.env.PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT86";
process.env.PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || "96434309-7796-489d-8924-ab56988a6076";
process.env.PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";
process.env.PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const originalFetch = globalThis.fetch;
function mockGlobalRefund() {
  globalThis.fetch = (async (url: any, init?: any) => ({
    json: async () => ({ success: true, data: { merchantTransactionId: "MOCK_RF_" + Date.now() } }),
  }) as any) as typeof fetch;
}
function restoreFetch() { globalThis.fetch = originalFetch; }

async function main() {
  console.log("P1 Payment Integrity Tests\n");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const { User } = await import("../models/User");
    const user: any = await User.create({
      name: "Integrity Tester", phone: `9${String(Date.now()).slice(-9)}`,
      role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1,
    });
    const cat: any = await Category.create({ name: "Int Cat", slug: `int-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "Int Product", slug: `int-prod-${Date.now()}`, description: "test",
      categoryId: cat._id, basePrice: 1000, salePrice: 800, baseSKU: "INT-001",
      hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });
    await InventoryState.create({ productId: prod._id, sku: "INT-001", stock: 10, reservedStock: 0, lowStockThreshold: 2 });

    async function makePendingOrder(tag: string, qty = 1) {
      const orderId = new mongoose.Types.ObjectId();
      await InventoryService.reserve({
        productId: String(prod._id), sku: "INT-001", quantity: qty,
        orderId: String(orderId), orderItemId: "INT-001",
        operationId: `RES_${tag}_INT-001`, reason: "test",
      });
      const order: any = await Order.create({
        _id: orderId, orderNumber: tag, userId: user._id,
        items: [{
          productId: prod._id, sku: "INT-001", nameSnapshot: prod.name,
          imageSnapshot: "", attributesSnapshot: {}, unitPrice: 1000, salePrice: 800,
          taxRate: 18, taxAmount: 144, discountAmount: 200, quantity: qty,
          finalLineTotal: 800 * qty,
        }],
        shippingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St",
          addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        billingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St",
          addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        pricingSnapshot: { subtotal: 800 * qty, itemsDiscount: 200 * qty, couponDiscount: 0,
          couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144 * qty, grandTotal: 944 * qty },
        paymentInfo: { method: "PHONEPE", status: "PENDING" },
        orderStatus: "PENDING_PAYMENT",
        statusHistory: [{ status: "PENDING_PAYMENT", timestamp: new Date() }],
        idempotencyKey: `idem-${tag}`,
      });
      const mtxn = newMerchantTransactionId(tag);
      await Payment.create({
        paymentId: `PAY_${tag}`, orderId: order._id, provider: "PHONEPE",
        merchantTransactionId: mtxn, amount: 944 * qty, currency: "INR",
        status: "PENDING", rawWebhookLogs: [],
      });
      return { order, mtxn };
    }

    // ─── FINDING-01: Amount Verification ───
    console.log("\n=== FINDING-01: Payment Amount Verification ===");

    // Test 1: Correct amount succeeds
    try {
      const { order, mtxn } = await makePendingOrder(`F1OK${Date.now().toString(36).toUpperCase()}`);
      const expectedPaise = 944 * 100;
      await PaymentService.confirmPaid(mtxn, "test-correct-amount", expectedPaise);
      const ord: any = await Order.findById(order._id).lean();
      const pay: any = await Payment.findOne({ merchantTransactionId: mtxn }).lean();
      if (ord.orderStatus !== "CONFIRMED") throw new Error(`order should be CONFIRMED, got ${ord.orderStatus}`);
      if (pay.status !== "PAID") throw new Error(`payment should be PAID, got ${pay.status}`);
      ok("correct amount -> payment confirmed and order CONFIRMED");
    } catch (e) { fail("correct amount -> payment confirmed and order CONFIRMED", e); }

    // Test 2: Wrong amount rejected
    try {
      const { order, mtxn } = await makePendingOrder(`F1BAD${Date.now().toString(36).toUpperCase()}`);
      let threw = false;
      try {
        await PaymentService.confirmPaid(mtxn, "test-wrong-amount", 1); // 1 paise instead of 94400
      } catch (e: any) {
        if (e?.code === "AMOUNT_MISMATCH") threw = true;
      }
      const pay: any = await Payment.findOne({ merchantTransactionId: mtxn }).lean();
      const ord: any = await Order.findById(order._id).lean();
      if (!threw) throw new Error("expected AMOUNT_MISMATCH error");
      if (pay.status !== "PENDING") throw new Error(`payment should stay PENDING, got ${pay.status}`);
      if (ord.orderStatus !== "PENDING_PAYMENT") throw new Error(`order should stay PENDING_PAYMENT, got ${ord.orderStatus}`);
      ok("wrong amount -> AMOUNT_MISMATCH error, payment stays PENDING");
    } catch (e) { fail("wrong amount -> AMOUNT_MISMATCH error, payment stays PENDING", e); }

    // Test 3: No amount (COD path) succeeds
    try {
      const tag = `F1COD${Date.now().toString(36).toUpperCase()}`;
      const orderId = new mongoose.Types.ObjectId();
      const order: any = await Order.create({
        _id: orderId, orderNumber: tag, userId: user._id,
        items: [{
          productId: prod._id, sku: "INT-001", nameSnapshot: prod.name,
          imageSnapshot: "", attributesSnapshot: {}, unitPrice: 800, salePrice: 800,
          taxRate: 18, taxAmount: 144, discountAmount: 0, quantity: 1, finalLineTotal: 800,
        }],
        shippingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St",
          addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        billingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St",
          addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        pricingSnapshot: { subtotal: 800, itemsDiscount: 0, couponDiscount: 0,
          couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144, grandTotal: 944 },
        paymentInfo: { method: "COD", status: "PENDING" },
        orderStatus: "CONFIRMED",
        statusHistory: [{ status: "CONFIRMED", timestamp: new Date() }],
        idempotencyKey: `idem-${tag}`,
      });
      await InventoryService.reserve({
        productId: String(prod._id), sku: "INT-001", quantity: 1,
        orderId: String(orderId), orderItemId: "INT-001",
        operationId: `RES_${tag}_INT-001`, reason: "test",
      });
      await Payment.create({
        paymentId: `PAY_${tag}`, orderId: order._id, provider: "COD",
        merchantTransactionId: `COD_${tag}`, amount: 944, currency: "INR",
        status: "PENDING", rawWebhookLogs: [],
      });
      await PaymentService.confirmPaid(`COD_${tag}`, "test-cod-no-amount");
      const ord: any = await Order.findById(order._id).lean();
      if (ord.orderStatus !== "CONFIRMED") throw new Error(`COD order should stay CONFIRMED, got ${ord.orderStatus}`);
      const pay: any = await Payment.findOne({ orderId: order._id }).lean();
      if (pay.status !== "PAID") throw new Error(`COD payment should be PAID, got ${pay.status}`);
      ok("no amount (COD) -> payment confirmed without amount check");
    } catch (e) { fail("no amount (COD) -> payment confirmed without amount check", e); }

    // ─── FINDING-02: Late Payment After Cancellation ───
    console.log("\n=== FINDING-02: Late Payment After Cancellation ===");

    // Test 4: Late payment after CANCELLED -> PAYMENT_RECEIVED + auto-refund
    try {
      const tag = `F2CAN${Date.now().toString(36).toUpperCase()}`;
      const { order, mtxn } = await makePendingOrder(tag);
      // Cancel the order
      await Order.findByIdAndUpdate(order._id, {
        $set: { orderStatus: "CANCELLED" },
        $push: { statusHistory: { status: "CANCELLED", timestamp: new Date(), notes: "test cancel" } },
      });
      // Mock fetch so the post-transaction refund call succeeds
      let refundCalled = false;
      globalThis.fetch = (async (url: any, init?: any) => {
        refundCalled = true;
        return { json: async () => ({ success: true, data: { merchantTransactionId: "MOCK_RF" } }) } as any;
      }) as typeof fetch;
      try {
        const result: any = await PaymentService.confirmPaid(mtxn, "test-late-payment", 94400);
        const ord: any = await Order.findById(order._id).lean();
        const pay: any = await Payment.findOne({ merchantTransactionId: mtxn }).lean();
        if (ord.orderStatus !== "PAYMENT_RECEIVED") throw new Error(`order should be PAYMENT_RECEIVED, got ${ord.orderStatus}`);
        if (pay.status !== "PAID") throw new Error(`payment should be PAID, got ${pay.status}`);
        if (!result.reconciliation) throw new Error("expected reconciliation=true");
        if (!pay.refundDetails?.refundId) throw new Error(`auto-refund should be initiated (refundCalled=${refundCalled})`);
        ok("late payment after CANCELLED -> PAYMENT_RECEIVED + auto-refund");
      } finally { globalThis.fetch = originalFetch; }
    } catch (e) { fail("late payment after CANCELLED -> PAYMENT_RECEIVED + auto-refund", e); }

    // Test 5: Late payment after REFUNDED -> PAYMENT_RECEIVED + auto-refund attempt
    try {
      const tag = `F2REF${Date.now().toString(36).toUpperCase()}`;
      const { order, mtxn } = await makePendingOrder(tag);
      await Order.findByIdAndUpdate(order._id, {
        $set: { orderStatus: "REFUNDED" },
        $push: { statusHistory: { status: "REFUNDED", timestamp: new Date(), notes: "test refund" } },
      });
      mockGlobalRefund();
      try {
        await PaymentService.confirmPaid(mtxn, "test-late-after-refunded", 94400);
      } finally { restoreFetch(); }
      const ord: any = await Order.findById(order._id).lean();
      if (ord.orderStatus !== "PAYMENT_RECEIVED") throw new Error(`order should be PAYMENT_RECEIVED, got ${ord.orderStatus}`);
      ok("late payment after REFUNDED -> PAYMENT_RECEIVED");
    } catch (e) { fail("late payment after REFUNDED -> PAYMENT_RECEIVED", e); }

    // Test 6: Already PAID payment -> idempotent duplicate
    try {
      const tag = `F2DUP${Date.now().toString(36).toUpperCase()}`;
      const { mtxn } = await makePendingOrder(tag);
      await PaymentService.confirmPaid(mtxn, "test-first", 94400);
      const r: any = await PaymentService.confirmPaid(mtxn, "test-second", 94400);
      if (!r.duplicate) throw new Error("expected duplicate=true on second confirm");
      ok("already PAID -> idempotent duplicate rejected");
    } catch (e) { fail("already PAID -> idempotent duplicate rejected", e); }

    // ─── FINDING-03: Expired Reservation + Successful Payment ───
    console.log("\n=== FINDING-03: Expired Reservation + Payment Recovery ===");

    // Test 7: Expired reservation, stock available -> reacquire + CONFIRMED
    try {
      const tag = `F3REC${Date.now().toString(36).toUpperCase()}`;
      const { order, mtxn } = await makePendingOrder(tag);
      // Expire the reservation by setting expiresAt in the past
      const resId = `RES_${String(order._id).toUpperCase()}_INT-001`;
      await InventoryReservation.findOneAndUpdate(
        { _id: resId },
        { $set: { status: "RELEASED", expiresAt: new Date(Date.now() - 60000) } }
      );
      // Decrement reservedStock to simulate release
      await InventoryState.findOneAndUpdate(
        { productId: prod._id, sku: "INT-001" },
        { $inc: { reservedStock: -1 } }
      );
      // Restore stock so reacquire can succeed (simulate stock replenishment)
      await InventoryState.findOneAndUpdate(
        { productId: prod._id, sku: "INT-001" },
        { $set: { stock: 10 } }
      );
      // Now confirm payment — should attempt reacquire
      await PaymentService.confirmPaid(mtxn, "test-reacquire", 94400);
      const ord: any = await Order.findById(order._id).lean();
      const pay: any = await Payment.findOne({ merchantTransactionId: mtxn }).lean();
      if (pay.status !== "PAID") throw new Error(`payment should be PAID, got ${pay.status}`);
      if (ord.orderStatus !== "CONFIRMED") throw new Error(`order should be CONFIRMED, got ${ord.orderStatus}`);
      // Verify inventory was committed
      const st: any = await InventoryState.findOne({ productId: prod._id, sku: "INT-001" }).lean();
      if (st.stock !== 9) throw new Error(`stock should be 9 after commit, got ${st.stock}`);
      ok("expired reservation, stock available -> reacquire + CONFIRMED");
    } catch (e) { fail("expired reservation, stock available -> reacquire + CONFIRMED", e); }

    // Test 8: Expired reservation, stock unavailable -> PAYMENT_RECEIVED
    try {
      const tag = `F3NO${Date.now().toString(36).toUpperCase()}`;
      const { order, mtxn } = await makePendingOrder(tag);
      // Expire the reservation
      const resId = `RES_${String(order._id).toUpperCase()}_INT-001`;
      await InventoryReservation.findOneAndUpdate(
        { _id: resId },
        { $set: { status: "RELEASED", expiresAt: new Date(Date.now() - 60000) } }
      );
      await InventoryState.findOneAndUpdate(
        { productId: prod._id, sku: "INT-001" },
        { $inc: { reservedStock: -1 } }
      );
      // Set stock to 0 so reacquire fails
      await InventoryState.findOneAndUpdate(
        { productId: prod._id, sku: "INT-001" },
        { $set: { stock: 0, reservedStock: 0 } }
      );
      await PaymentService.confirmPaid(mtxn, "test-no-stock", 94400);
      const ord: any = await Order.findById(order._id).lean();
      const pay: any = await Payment.findOne({ merchantTransactionId: mtxn }).lean();
      if (pay.status !== "PAID") throw new Error(`payment should be PAID, got ${pay.status}`);
      if (ord.orderStatus !== "PAYMENT_RECEIVED") throw new Error(`order should be PAYMENT_RECEIVED, got ${ord.orderStatus}`);
      ok("expired reservation, stock 0 -> PAYMENT_RECEIVED (manual reconciliation)");
    } catch (e) { fail("expired reservation, stock 0 -> PAYMENT_RECEIVED (manual reconciliation)", e); }

    // Restore stock for remaining tests
    await InventoryState.findOneAndUpdate(
      { productId: prod._id, sku: "INT-001" },
      { $set: { stock: 10, reservedStock: 0 } }
    );

    // Test 9: PAYMENT_RECEIVED orders cannot re-initiate payment
    try {
      const tag = `F3BLOCK${Date.now().toString(36).toUpperCase()}`;
      const orderId = new mongoose.Types.ObjectId();
      const order: any = await Order.create({
        _id: orderId, orderNumber: tag, userId: user._id,
        items: [{
          productId: prod._id, sku: "INT-001", nameSnapshot: prod.name,
          imageSnapshot: "", attributesSnapshot: {}, unitPrice: 800, salePrice: 800,
          taxRate: 18, taxAmount: 144, discountAmount: 0, quantity: 1, finalLineTotal: 800,
        }],
        shippingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St",
          addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        billingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123 St",
          addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        pricingSnapshot: { subtotal: 800, itemsDiscount: 0, couponDiscount: 0,
          couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144, grandTotal: 944 },
        paymentInfo: { method: "PHONEPE", status: "PAID" },
        orderStatus: "PAYMENT_RECEIVED",
        statusHistory: [{ status: "PAYMENT_RECEIVED", timestamp: new Date() }],
        idempotencyKey: `idem-${tag}`,
      });
      let threw = false;
      try {
        await PaymentService.initiate(tag);
      } catch (e: any) {
        if (e?.code === "INVALID_STATUS") threw = true;
      }
      if (!threw) throw new Error("expected INVALID_STATUS for PAYMENT_RECEIVED");
      ok("PAYMENT_RECEIVED blocks re-initiation of payment");
    } catch (e) { fail("PAYMENT_RECEIVED blocks re-initiation of payment", e); }

    // ─── Invariant Checks ───
    console.log("\n=== Invariant Verification ===");
    try {
      const inv = await InventoryService.assertInvariants();
      if (inv.violations.length > 0) {
        throw new Error(`inventory violations: ${JSON.stringify(inv.violations)}`);
      }
      ok(`inventory invariants hold (${inv.checked} states checked, 0 violations)`);
    } catch (e) { fail("inventory invariant check", e); }

  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("All P1 payment integrity tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
