/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { InventoryState } from "../models/Inventory";
import { Order } from "../models/Order";
import { OrderService } from "../services/order.service";
import { InventoryService } from "../services/inventory.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? `${e.message} [${(e as any).code || ""}]` : e); };

const addrSnap = { fullName: "T", phone: "9876543210", addressLine1: "123 St", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" };
const priceSnap = { subtotal: 800, itemsDiscount: 200, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144, grandTotal: 944 };

async function makeOrder(orderNumber: string, userId: string, productId: string, qty: number, status: "PENDING_PAYMENT" | "CONFIRMED" = "PENDING_PAYMENT", committed = false) {
  const orderId = new mongoose.Types.ObjectId();
  await InventoryService.reserve({ productId, sku: "ORD-T1", quantity: qty, orderId: String(orderId), orderItemId: "ORD-T1", operationId: `RES_${orderNumber}_ORD-T1`, reason: "test" });
  if (committed) {
    await InventoryService.commit({ productId, sku: "ORD-T1", quantity: qty, orderId: String(orderId), operationId: `COMMIT_${orderNumber}_ORD-T1`, reason: "test" });
  }
  const order: any = await Order.create({
    _id: orderId, orderNumber, userId,
    items: [{ productId, sku: "ORD-T1", nameSnapshot: "P", imageSnapshot: "", attributesSnapshot: {}, unitPrice: 1000, salePrice: 800, taxRate: 18, taxAmount: 144, discountAmount: 200, quantity: qty, finalLineTotal: 800 * qty }],
    shippingAddress: addrSnap, billingAddress: addrSnap, pricingSnapshot: priceSnap,
    paymentInfo: { method: "COD", status: "PENDING" },
    orderStatus: status,
    statusHistory: [{ status, timestamp: new Date() }],
    idempotencyKey: `idem-${orderNumber}`,
  });
  return order;
}

async function main() {
  console.log("🧪 Starting order lifecycle tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const { User } = await import("../models/User");
    const user: any = await User.create({ name: "Order Tester", phone: `6${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const admin: any = await User.create({ name: "Admin", phone: `5${String(Date.now()).slice(-9)}`, role: "ADMIN", status: "ACTIVE", sessionVersion: 1 });
    const userId = String(user._id);
    const adminId = String(admin._id);
    const cat: any = await Category.create({ name: "O Cat", slug: `o-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "O Product", slug: `o-product-${Date.now()}`, description: "d", categoryId: cat._id,
      basePrice: 1000, salePrice: 800, baseSKU: "ORD-T1", hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });
    const pid = String(prod._id);
    await InventoryState.create({ productId: prod._id, sku: "ORD-T1", stock: 20, reservedStock: 0, lowStockThreshold: 2 });

    // 1. Admin can force any non-terminal transition (by design)
    try {
      const o = await makeOrder(`ORDINV${Date.now()}`, userId, pid, 1);
      // Admin can force PENDING→SHIPPED (admin override is intentional)
      await OrderService.adminTransition(o.orderNumber, "SHIPPED" as any, adminId, { trackingNumber: "T1" });
      const ord: any = await Order.findOne({ orderNumber: o.orderNumber }).lean();
      if (ord.orderStatus !== "SHIPPED") throw new Error(`expected SHIPPED, got ${ord.orderStatus}`);
      ok("admin can force any non-terminal transition (PENDING→SHIPPED)");
    } catch (e) { fail("admin can force any non-terminal transition (PENDING→SHIPPED)", e); }

    // 2. Cancel PENDING releases reserved (stock unchanged)
    try {
      const before: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      const o = await makeOrder(`ORDCAN${Date.now()}`, userId, pid, 2);
      const mid: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      if (mid.reservedStock !== before.reservedStock + 2) throw new Error("reserve failed");
      await OrderService.cancelOrder(o.orderNumber, userId, "changed mind", "CUSTOMER");
      const after: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      if (after.stock !== mid.stock) throw new Error(`stock should be unchanged, ${mid.stock} -> ${after.stock}`);
      if (after.reservedStock !== before.reservedStock) throw new Error("reserved should be released");
      const ord: any = await Order.findOne({ orderNumber: o.orderNumber }).lean();
      if (ord.orderStatus !== "CANCELLED") throw new Error("expected CANCELLED");
      ok("cancel PENDING releases reserved stock");
    } catch (e) { fail("cancel PENDING releases reserved stock", e); }

    // 3. Cancel committed CONFIRMED restocks physical stock
    try {
      const before: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      const o = await makeOrder(`ORDRST${Date.now()}`, userId, pid, 2, "CONFIRMED", true);
      const mid: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      if (mid.stock !== before.stock - 2) throw new Error("commit failed");
      await OrderService.cancelOrder(o.orderNumber, userId, "changed mind", "CUSTOMER");
      const after: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      if (after.stock !== before.stock) throw new Error(`expected restock to ${before.stock}, got ${after.stock}`);
      ok("cancel committed order restocks physical stock");
    } catch (e) { fail("cancel committed order restocks physical stock", e); }

    // 4. Idempotent cancel
    try {
      const o = await makeOrder(`ORDIDM${Date.now()}`, userId, pid, 1);
      const first: any = await OrderService.cancelOrder(o.orderNumber, userId, "changed mind", "CUSTOMER");
      const before: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      const second: any = await OrderService.cancelOrder(o.orderNumber, userId, "changed mind", "CUSTOMER");
      if (!second.duplicate) throw new Error("second cancel should be duplicate");
      const after: any = await InventoryState.findOne({ sku: "ORD-T1" }).lean();
      if (after.stock !== before.stock || after.reservedStock !== before.reservedStock) {
        throw new Error("double cancel mutated inventory");
      }
      void first;
      ok("idempotent cancel (no double inventory mutation)");
    } catch (e) { fail("idempotent cancel (no double inventory mutation)", e); }

    // 5. Cancel after SHIPPED rejected
    try {
      const o = await makeOrder(`ORDSHP${Date.now()}`, userId, pid, 1, "CONFIRMED", true);
      await OrderService.adminTransition(o.orderNumber, "PROCESSING", adminId);
      await OrderService.adminTransition(o.orderNumber, "PACKED", adminId);
      await OrderService.adminTransition(o.orderNumber, "SHIPPED", adminId, { trackingNumber: "TRK123" });
      let threw = false;
      try {
        await OrderService.cancelOrder(o.orderNumber, userId, "too late", "CUSTOMER");
      } catch (err: any) {
        if (err?.code === "INVALID_STATUS") threw = true;
      }
      if (!threw) throw new Error("expected INVALID_STATUS");
      ok("cancel after SHIPPED rejected");
    } catch (e) { fail("cancel after SHIPPED rejected", e); }

    // 6. Full fulfillment path + tracking-required guard
    try {
      const o = await makeOrder(`ORDFUL${Date.now()}`, userId, pid, 1, "CONFIRMED", true);
      // Admin can force any non-terminal transition
      await OrderService.adminTransition(o.orderNumber, "PROCESSING", adminId);
      await OrderService.adminTransition(o.orderNumber, "PACKED", adminId);
      // SHIPPED without tracking should fail (from PACKED)
      let trackThrew = false;
      try {
        await OrderService.adminTransition(o.orderNumber, "SHIPPED", adminId);
      } catch (err: any) {
        if (err?.code === "TRACKING_REQUIRED") trackThrew = true;
      }
      if (!trackThrew) throw new Error("expected TRACKING_REQUIRED");
      await OrderService.adminTransition(o.orderNumber, "SHIPPED", adminId, { trackingNumber: "TRK999", courier: "Delhivery" });
      await OrderService.adminTransition(o.orderNumber, "OUT_FOR_DELIVERY", adminId);
      await OrderService.adminTransition(o.orderNumber, "DELIVERED", adminId);
      const ord: any = await Order.findOne({ orderNumber: o.orderNumber }).lean();
      if (ord.orderStatus !== "DELIVERED") throw new Error(`expected DELIVERED got ${ord.orderStatus}`);
      if (!ord.shippingDetails?.deliveredAt) throw new Error("missing deliveredAt");
      ok("fulfillment path with guards (tracking required for SHIPPED)");
    } catch (e) { fail("fulfillment path with guards (tracking required for SHIPPED)", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All order tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
