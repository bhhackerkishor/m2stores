/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { InventoryState } from "../models/Inventory";
import { Coupon } from "../models/Coupon";
import { CartService } from "../services/cart.service";
import { WishlistService } from "../services/wishlist.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };

async function main() {
  console.log("🧪 Starting cart & wishlist tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const cat: any = await Category.create({ name: "Test Cat", slug: `test-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "Test Product",
      slug: `test-product-${Date.now()}`,
      description: "desc",
      categoryId: cat._id,
      basePrice: 1000,
      salePrice: 800,
      baseSKU: "CART-T1",
      hasVariants: false,
      status: "PUBLISHED",
      images: [],
    });
    await InventoryState.create({ productId: prod._id, sku: "CART-T1", stock: 5, reservedStock: 0, lowStockThreshold: 2 });
    const now = new Date();
    await Coupon.create({
      code: "TEST10", discountType: "PERCENTAGE", discountValue: 10, minOrderValue: 100,
      maxDiscountAmount: 200, usageLimitTotal: 100, usageCount: 0, perUserLimit: 5,
      perUserUsageCount: {}, startDate: new Date(now.getTime() - 86400000),
      expiryDate: new Date(now.getTime() + 86400000), isActive: true,
    });

    const guest = { guestSessionId: "guest-test-1", isGuest: true };
    const pid = String(prod._id);

    // 1. Guest add
    try {
      const v: any = await CartService.add(guest, { productId: pid, sku: "CART-T1", quantity: 2 });
      if (v.totalItems !== 2) throw new Error(`expected 2 items, got ${v.totalItems}`);
      if (v.items[0].unitPrice !== 800) throw new Error(`server price should be 800, got ${v.items[0].unitPrice}`);
      ok("guest add to cart with server pricing");
    } catch (e) { fail("guest add to cart with server pricing", e); }

    // 2. Client price ignored — service always recomputes (add more, verify totals)
    try {
      const v: any = await CartService.add(guest, { productId: pid, sku: "CART-T1", quantity: 1 });
      if (v.pricing.subtotal !== 2400) throw new Error(`expected subtotal 2400, got ${v.pricing.subtotal}`);
      ok("server recomputes totals (client price ignored)");
    } catch (e) { fail("server recomputes totals (client price ignored)", e); }

    // 3. Quantity capped by availability
    try {
      let threw = false;
      try {
        await CartService.updateQty(guest, "CART-T1", 10);
      } catch (err: any) {
        if (err?.code === "INSUFFICIENT_STOCK") threw = true;
      }
      if (!threw) throw new Error("expected INSUFFICIENT_STOCK when exceeding available");
      ok("quantity capped by live availability");
    } catch (e) { fail("quantity capped by live availability", e); }

    // 4. Apply coupon server-side
    try {
      const v: any = await CartService.applyCoupon(guest, "TEST10");
      if (v.pricing.couponDiscount <= 0) throw new Error("coupon discount should be > 0");
      ok("coupon applied server-side");
    } catch (e) { fail("coupon applied server-side", e); }

    // 5. Merge guest -> user
    try {
      const { User } = await import("../models/User");
      const user: any = await User.create({ name: "Cart Tester", phone: `9${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
      const out: any = await CartService.mergeGuestIntoUser("guest-test-1", String(user._id));
      if (out.merged < 1) throw new Error("expected >=1 merged");
      const view: any = await CartService.view({ userId: String(user._id), isGuest: false });
      if (view.totalItems < 1) throw new Error("user cart empty after merge");
      ok("guest cart merged into user on login");
    } catch (e) { fail("guest cart merged into user on login", e); }

    // 6. Wishlist add + move to cart
    try {
      const guest2 = { guestSessionId: "guest-wish-1", isGuest: true };
      await WishlistService.add(guest2, { productId: pid, sku: "CART-T1" });
      const w1: any = await WishlistService.view(guest2);
      if (w1.total !== 1) throw new Error("wishlist should have 1");
      await WishlistService.moveToCart(guest2, "CART-T1", 1);
      const w2: any = await WishlistService.view(guest2);
      if (w2.total !== 0) throw new Error("wishlist should be empty after move");
      const c: any = await CartService.view(guest2);
      if (c.totalItems < 1) throw new Error("cart should have item after move");
      ok("wishlist move to cart");
    } catch (e) { fail("wishlist move to cart", e); }

    // 7. Out-of-stock item flagged in view, not priced
    try {
      await InventoryState.findOneAndUpdate({ sku: "CART-T1" }, { $set: { stock: 0, reservedStock: 0 } });
      const guest3 = { guestSessionId: "guest-oos-1", isGuest: true };
      // Bypass add guard by inserting directly, then validate view flags it
      const { Cart } = await import("../models/Cart");
      await Cart.create({ guestSessionId: "guest-oos-1", items: [{ productId: prod._id, sku: "CART-T1", quantity: 1 }] });
      const v: any = await CartService.view(guest3);
      if (!v.issues.some((i: any) => i.type === "OUT_OF_STOCK")) throw new Error("expected OUT_OF_STOCK issue");
      if (v.items.length !== 0) throw new Error("OOS item should be excluded from priced items");
      ok("out-of-stock flagged at validation");
    } catch (e) { fail("out-of-stock flagged at validation", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All cart tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
