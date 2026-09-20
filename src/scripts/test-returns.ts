/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { Payment } from "../models/Payment";
import { InventoryState } from "../models/Inventory";
import { ReturnService } from "../services/return.service";
import { ShippingService } from "../services/shipping.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? `${e.message} [${(e as any).code || ""}]` : e); };

const addrSnap = { fullName: "T", phone: "9876543210", addressLine1: "123 St", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" };

async function main() {
  console.log("🧪 Starting returns & refunds tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const buyer: any = await User.create({ name: "Returner", phone: `4${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const admin: any = await User.create({ name: "Returns Admin", phone: `5${String(Date.now()).slice(-9)}`, role: "ADMIN", status: "ACTIVE", sessionVersion: 1 });
    const userId = String(buyer._id);
    const adminId = String(admin._id);
    const cat: any = await Category.create({ name: "Ret Cat", slug: `ret-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "Return Product", slug: `return-product-${Date.now()}`, description: "d", categoryId: cat._id,
      basePrice: 1000, salePrice: 800, baseSKU: "RET-001", hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });
    await InventoryState.create({ productId: prod._id, sku: "RET-001", stock: 8, reservedStock: 0, lowStockThreshold: 2 });

    const mkDelivered = async (orderNumber: string, qty: number, daysAgo = 0) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const o: any = await Order.create({
        orderNumber, userId: buyer._id,
        items: [{ productId: prod._id, sku: "RET-001", nameSnapshot: prod.name, imageSnapshot: "", attributesSnapshot: {}, unitPrice: 1000, salePrice: 800, taxRate: 18, taxAmount: 144 * qty, discountAmount: 200 * qty, quantity: qty, finalLineTotal: 800 * qty }],
        shippingAddress: addrSnap, billingAddress: addrSnap,
        pricingSnapshot: { subtotal: 800 * qty, itemsDiscount: 200 * qty, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144 * qty, grandTotal: 944 * qty },
        paymentInfo: { method: "PHONEPE", status: "PAID" },
        orderStatus: "DELIVERED",
        statusHistory: [{ status: "DELIVERED", timestamp: d }],
        shippingDetails: { deliveredAt: d },
        idempotencyKey: `idem-${orderNumber}`,
      });
      await Payment.create({ paymentId: `PAY-${orderNumber}`, orderId: o._id, provider: "PHONEPE", merchantTransactionId: `MTXN-${orderNumber}`, amount: 944 * qty, currency: "INR", status: "PAID", rawWebhookLogs: [] });
      return o;
    };

    // 1. Out-of-window rejected
    try {
      const o = await mkDelivered(`RETWIN${Date.now()}`, 1, 30);
      let threw = false;
      try {
        await ReturnService.request(userId, o.orderNumber, { items: [{ sku: "RET-001", quantity: 1 }], reason: "Too late, testing window" });
      } catch (err: any) {
        if (err?.code === "WINDOW_EXPIRED") threw = true;
      }
      if (!threw) throw new Error("expected WINDOW_EXPIRED");
      ok("return window enforced");
    } catch (e) { fail("return window enforced", e); }

    // 2. Partial return request + over-qty guard
    let rmaId = "";
    try {
      const o = await mkDelivered(`RETPART${Date.now()}`, 2, 0);
      let threw = false;
      try {
        await ReturnService.request(userId, o.orderNumber, { items: [{ sku: "RET-001", quantity: 3 }], reason: "Too many units requested" });
      } catch (err: any) {
        if (err?.code === "QTY_EXCEEDED") threw = true;
      }
      if (!threw) throw new Error("expected QTY_EXCEEDED");
      const out: any = await ReturnService.request(userId, o.orderNumber, { items: [{ sku: "RET-001", quantity: 1 }], reason: "One unit defective, please help" });
      rmaId = String(out.request._id);
      if (out.request.status !== "REQUESTED") throw new Error("expected REQUESTED");
      const ord: any = await Order.findOne({ orderNumber: o.orderNumber }).lean();
      if (ord.orderStatus !== "RETURN_REQUESTED") throw new Error(`expected RETURN_REQUESTED got ${ord.orderStatus}`);
      ok("partial return requested (over-qty rejected)");
    } catch (e) { fail("partial return requested (over-qty rejected)", e); }

    // 3. Approve → receive restocks
    try {
      const before: any = await InventoryState.findOne({ sku: "RET-001" }).lean();
      await ReturnService.approve(rmaId, adminId, "SCHEDULED", "ok");
      const out: any = await ReturnService.receive(rmaId, adminId);
      if (out.request.status !== "RECEIVED") throw new Error("expected RECEIVED");
      const after: any = await InventoryState.findOne({ sku: "RET-001" }).lean();
      if (after.stock !== before.stock + 1) throw new Error(`expected restock +1: ${before.stock} -> ${after.stock}`);
      const ord: any = await Order.findOne({}).sort({ createdAt: -1 }).lean();
      void ord;
      ok("receive restocks physical inventory");
    } catch (e) { fail("receive restocks physical inventory", e); }

    // 4. Refund completes via provider abstraction (mocked HTTP)
    try {
      const { getPaymentProvider } = await import("../services/payment/phonepe.provider");
      void getPaymentProvider;
      // Mock fetch globally for refund call
      const realFetch = global.fetch;
      (global as any).fetch = async () => ({ json: async () => ({ success: true, data: { merchantTransactionId: "RF-TEST-1" } }) });
      try {
        const out: any = await ReturnService.refund(rmaId, adminId);
        if (out.request.status !== "REFUNDED") throw new Error(`expected REFUNDED got ${out.request.status}`);
        if (out.request.refund.status !== "COMPLETED") throw new Error("refund not completed");
      } finally {
        (global as any).fetch = realFetch;
      }
      ok("refund completes through PaymentProvider");
    } catch (e) { fail("refund completes through PaymentProvider", e); }

    // 5. Double refund idempotent
    try {
      const out: any = await ReturnService.refund(rmaId, adminId);
      if (!out.duplicate) throw new Error("expected duplicate");
      ok("double refund idempotent");
    } catch (e) { fail("double refund idempotent", e); }

    // 6. Shipment records provider/fee/tracking events
    try {
      const o = await mkDelivered(`RETSHP${Date.now()}`, 1, 0);
      const details: any = await ShippingService.createShipment(o.orderNumber, { trackingNumber: "TRK-123", courier: "Delhivery", fee: 49 }, adminId);
      if (!details.shipmentId || details.trackingNumber !== "TRK-123") throw new Error("shipment not recorded");
      const d2: any = await ShippingService.addTrackingEvent(o.orderNumber, { status: "IN_TRANSIT", location: "Mumbai Hub" });
      if ((d2.events || []).length < 2) throw new Error("expected 2 tracking events");
      ok("shipments capture provider/fee/tracking events");
    } catch (e) { fail("shipments capture provider/fee/tracking events", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All return/refund tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
