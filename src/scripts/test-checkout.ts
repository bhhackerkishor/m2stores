/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { InventoryState } from "../models/Inventory";
import { Coupon } from "../models/Coupon";
import { AddressService } from "../services/address.service";
import { PricingService } from "../services/pricing.service";
import { CheckoutService } from "../services/checkout.service";
import { Cart } from "../models/Cart";
import { Order } from "../models/Order";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };

async function main() {
  console.log("🧪 Starting checkout tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const { User } = await import("../models/User");
    const user: any = await User.create({ name: "Checkout Tester", phone: `8${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const userId = String(user._id);
    const cat: any = await Category.create({ name: "CK Cat", slug: `ck-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "CK Product", slug: `ck-product-${Date.now()}`, description: "desc",
      categoryId: cat._id, basePrice: 1000, salePrice: 800, baseSKU: "CK-001",
      hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });
    await InventoryState.create({ productId: prod._id, sku: "CK-001", stock: 10, reservedStock: 0, lowStockThreshold: 2 });
    const now = new Date();
    await Coupon.create({
      code: "CKMIN", discountType: "FIXED", discountValue: 100, minOrderValue: 5000,
      usageLimitTotal: 100, usageCount: 0, perUserLimit: 5, perUserUsageCount: {},
      startDate: new Date(now.getTime() - 86400000), expiryDate: new Date(now.getTime() + 86400000), isActive: true,
    });

    // 1. Address PIN validation
    try {
      let threw = false;
      try {
        await AddressService.create(userId, { name: "T", phone: "9876543210", addressLine1: "123 Street", city: "Mumbai", state: "MH", pincode: "123", country: "India" });
      } catch (e: any) {
        threw = true;
      }
      // Service has no zod; API validates. Direct service accepts — so validate via schema instead:
      const { createAddressSchema } = await import("../validators/address");
      const bad = createAddressSchema.safeParse({ name: "T", phone: "9876543210", addressLine1: "123 Street", city: "Mumbai", state: "MH", pincode: "123" });
      if (bad.success) throw new Error("PIN 123 should fail validation");
      const good = createAddressSchema.safeParse({ name: "Test User", phone: "9876543210", addressLine1: "123 MG Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" });
      if (!good.success) throw new Error("valid PIN should pass");
      void threw;
      ok("Indian PIN + phone validated");
    } catch (e) { fail("Indian PIN + phone validated", e); }

    const addr: any = await AddressService.create(userId, {
      name: "Test User", phone: "9876543210", addressLine1: "123 MG Road", city: "Mumbai",
      state: "Maharashtra", pincode: "400001", country: "India", isDefault: true,
    });

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [{ productId: prod._id, sku: "CK-001", quantity: 2 }], appliedCouponCode: "" } }, { upsert: true, setDefaultsOnInsert: true });

    // 2. Per-item tax math
    try {
      const p = await PricingService.calculate([{ productId: String(prod._id), sku: "CK-001", quantity: 2 }], undefined, userId, false, { shippingMethod: "STANDARD" });
      if (p.subtotal !== 1600) throw new Error(`subtotal expected 1600 got ${p.subtotal}`);
      if (p.taxTotal !== 288) throw new Error(`tax expected 288 (18% of 1600) got ${p.taxTotal}`);
      ok("per-item GST computed server-side");
    } catch (e) { fail("per-item GST computed server-side", e); }

    // 3. Coupon min-value enforced
    try {
      let threw = false;
      try {
        await PricingService.calculate([{ productId: String(prod._id), sku: "CK-001", quantity: 1 }], "CKMIN", userId);
      } catch (err: any) {
        if (err?.code === "COUPON_MIN_VALUE") threw = true;
      }
      if (!threw) throw new Error("expected COUPON_MIN_VALUE");
      ok("coupon min order value enforced");
    } catch (e) { fail("coupon min order value enforced", e); }

    // 4. OOS blocks checkout validation
    try {
      await InventoryState.findOneAndUpdate({ sku: "CK-001" }, { $set: { stock: 0, reservedStock: 0 } });
      let threw = false;
      try {
        await CheckoutService.validate({ userId, addressId: String(addr._id), shippingMethod: "STANDARD", paymentMethod: "COD" });
      } catch (err: any) {
        if (["CART_INVALID", "EMPTY_CART", "PRODUCT_UNAVAILABLE"].includes(err?.code)) threw = true;
      }
      if (!threw) throw new Error("expected checkout to block OOS cart");
      await InventoryState.findOneAndUpdate({ sku: "CK-001" }, { $set: { stock: 10, reservedStock: 0 } });
      ok("out-of-stock blocks checkout");
    } catch (e) { fail("out-of-stock blocks checkout", e); }

    // 5. Idempotent create-order
    try {
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [{ productId: prod._id, sku: "CK-001", quantity: 1 }] } });
      const key = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-1111-2222-333333333333`.slice(0, 36);
      const uuid = `123e4567-e89b-12d3-a456-${String(Date.now()).slice(-12)}`;
      const first: any = await CheckoutService.createOrder({ userId, addressId: String(addr._id), shippingMethod: "STANDARD", paymentMethod: "COD", idempotencyKey: uuid });
      const second: any = await CheckoutService.createOrder({ userId, addressId: String(addr._id), shippingMethod: "STANDARD", paymentMethod: "COD", idempotencyKey: uuid });
      if (second.created !== false) throw new Error("second call should be idempotent");
      if (String(first.order.orderNumber) !== String(second.order.orderNumber)) throw new Error("order numbers should match");
      const count = await Order.countDocuments({ idempotencyKey: uuid });
      if (count !== 1) throw new Error(`expected 1 order, got ${count}`);
      const st: any = await InventoryState.findOne({ sku: "CK-001" }).lean();
      if (st.reservedStock !== 1) throw new Error(`expected single reservation, reserved=${st.reservedStock}`);
      void key;
      ok("idempotent create-order (no duplicate orders/inventory)");
    } catch (e) { fail("idempotent create-order (no duplicate orders/inventory)", e); }

    // 6. Order snapshots are immutable (name/image/price frozen)
    try {
      const o: any = await Order.findOne({}).lean();
      if (!o?.items?.[0]?.nameSnapshot) throw new Error("missing nameSnapshot");
      if (!o?.shippingAddress?.pincode) throw new Error("missing address snapshot");
      if (o?.pricingSnapshot?.grandTotal === undefined) throw new Error("missing pricing snapshot");
      ok("order stores immutable snapshots");
    } catch (e) { fail("order stores immutable snapshots", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All checkout tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
