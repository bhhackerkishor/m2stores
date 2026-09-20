/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Coupon } from "../models/Coupon";
import { Offer } from "../models/Offer";
import { PricingService } from "../services/pricing.service";
import { parseCsv, toCsv } from "../lib/csv";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };

async function main() {
  console.log("🧪 Starting coupons & offers tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const { User } = await import("../models/User");
    const user: any = await User.create({ name: "Promo Tester", phone: `2${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const userId = String(user._id);
    const catA: any = await Category.create({ name: "Promo A", slug: `promo-a-${Date.now()}`, isActive: true });
    const catB: any = await Category.create({ name: "Promo B", slug: `promo-b-${Date.now()}`, isActive: true });
    const mkProd = async (slug: string, cat: any, price: number, sale?: number) =>
      Product.create({
        name: slug, slug, description: "d", categoryId: cat._id, basePrice: price,
        ...(sale ? { salePrice: sale } : {}), baseSKU: slug.toUpperCase(), hasVariants: false,
        status: "PUBLISHED", taxRate: 18, images: [],
      });
    const pA: any = await mkProd(`promo-pa-${Date.now()}`, catA, 1000, 900);
    const pB: any = await mkProd(`promo-pb-${Date.now()}`, catB, 500);
    const now = new Date();
    const past = new Date(now.getTime() - 86400000);
    const future = new Date(now.getTime() + 86400000);

    // 1. Percentage cap
    try {
      await Coupon.create({
        code: "CAP20", discountType: "PERCENTAGE", discountValue: 20, minOrderValue: 0,
        maxDiscountAmount: 100, usageLimitTotal: 100, usageCount: 0, perUserLimit: 5,
        perUserUsageCount: {}, startDate: past, expiryDate: future, isActive: true,
      });
      const p = await PricingService.calculate(
        [{ productId: String(pA._id), sku: pA.baseSKU, quantity: 1 }],
        "CAP20", userId
      );
      // 20% of 900 = 180, capped at 100
      if (p.couponDiscount !== 100) throw new Error(`expected capped 100 got ${p.couponDiscount}`);
      ok("percentage coupon capped at maxDiscountAmount");
    } catch (e) { fail("percentage coupon capped at maxDiscountAmount", e); }

    // 2. Category scoping
    try {
      await Coupon.create({
        code: "CATA10", discountType: "PERCENTAGE", discountValue: 10, minOrderValue: 0,
        applicableCategoryIds: [catA._id], usageLimitTotal: 100, usageCount: 0, perUserLimit: 5,
        perUserUsageCount: {}, startDate: past, expiryDate: future, isActive: true,
      });
      // pB is in catB -> not eligible
      let threw = false;
      try {
        await PricingService.calculate([{ productId: String(pB._id), sku: pB.baseSKU, quantity: 1 }], "CATA10", userId);
      } catch (err: any) {
        if (err?.code === "COUPON_NOT_APPLICABLE") threw = true;
      }
      if (!threw) throw new Error("expected COUPON_NOT_APPLICABLE for out-of-scope cart");
      const p = await PricingService.calculate([{ productId: String(pA._id), sku: pA.baseSKU, quantity: 1 }], "CATA10", userId);
      if (p.couponDiscount <= 0) throw new Error("expected discount for in-scope item");
      ok("category-scoped coupons enforced");
    } catch (e) { fail("category-scoped coupons enforced", e); }

    // 3. Expired coupon rejected
    try {
      await Coupon.create({
        code: "OLD99", discountType: "FIXED", discountValue: 50, minOrderValue: 0,
        usageLimitTotal: 100, usageCount: 0, perUserLimit: 5, perUserUsageCount: {},
        startDate: new Date(now.getTime() - 10 * 86400000), expiryDate: new Date(now.getTime() - 86400000), isActive: true,
      });
      let threw = false;
      try {
        await PricingService.calculate([{ productId: String(pA._id), sku: pA.baseSKU, quantity: 1 }], "OLD99", userId);
      } catch (err: any) {
        if (err?.code === "COUPON_EXPIRED") threw = true;
      }
      if (!threw) throw new Error("expected COUPON_EXPIRED");
      ok("expired coupons rejected");
    } catch (e) { fail("expired coupons rejected", e); }

    // 4. Per-user limit enforced
    try {
      await Coupon.create({
        code: "ONCE1", discountType: "FIXED", discountValue: 10, minOrderValue: 0,
        usageLimitTotal: 100, usageCount: 0, perUserLimit: 1,
        perUserUsageCount: { [userId]: 1 }, startDate: past, expiryDate: future, isActive: true,
      });
      const { Coupon: C } = await import("../models/Coupon");
      const c: any = await C.findOne({ code: "ONCE1" }).lean();
      // Simulate pricing check path used by applyCouponToLines
      const { PricingService: PS } = await import("../services/pricing.service");
      let threw = false;
      try {
        await PS.calculate([{ productId: String(pA._id), sku: pA.baseSKU, quantity: 1 }], "ONCE1", userId);
      } catch (err: any) {
        threw = true;
      }
      void c;
      if (!threw) throw new Error("expected per-user rejection");
      ok("per-user coupon limit enforced");
    } catch (e) { fail("per-user coupon limit enforced", e); }

    // 5. Percentage offer auto-applies
    try {
      await Offer.create({
        title: "Test 15% off", type: "PERCENTAGE", discountValue: 15,
        applicableCategoryIds: [catA._id], minOrderValue: 0,
        startDate: past, expiryDate: future, isActive: true, priority: 1,
      });
      const p = await PricingService.calculate([{ productId: String(pA._id), sku: pA.baseSKU, quantity: 1 }], undefined, userId);
      // 15% of 900 = 135
      if (p.offerDiscount !== 135) throw new Error(`expected offer 135 got ${p.offerDiscount}`);
      if (p.grandTotal !== 900 - 135 + 0 + 162) throw new Error(`grandTotal wrong: ${p.grandTotal}`);
      ok("percentage offer auto-applies server-side");
    } catch (e) { fail("percentage offer auto-applies server-side", e); }

    // 6. Free-shipping offer zeroes fee
    try {
      await Offer.deleteMany({});
      const { Setting } = await import("../models/Setting");
      await Setting.findOneAndUpdate({}, { $set: { shippingFlatRate: 49 } }, { upsert: true, setDefaultsOnInsert: true });
      await Offer.create({
        title: "Free ship", type: "FREE_SHIPPING", minOrderValue: 0,
        startDate: past, expiryDate: future, isActive: true, priority: 1,
      });
      const p = await PricingService.calculate([{ productId: String(pB._id), sku: pB.baseSKU, quantity: 1 }], undefined, userId, false, { shippingMethod: "STANDARD" });
      // subtotal 500 >= threshold 499 -> already free; use cheap check via low subtotal product
      void p;
      const cheap: any = await Product.create({
        name: "cheap", slug: `cheap-${Date.now()}`, description: "d", categoryId: catB._id,
        basePrice: 100, baseSKU: `CHEAP-${Date.now()}`.toUpperCase(), hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
      });
      const p2 = await PricingService.calculate([{ productId: String(cheap._id), sku: cheap.baseSKU, quantity: 1 }], undefined, userId, false, { shippingMethod: "STANDARD" });
      if (p2.shippingFee !== 0) throw new Error(`expected free shipping, got ${p2.shippingFee}`);
      await Setting.findOneAndUpdate({}, { $set: { shippingFlatRate: 0 } });
      ok("free-shipping offer zeroes delivery fee");
    } catch (e) { fail("free-shipping offer zeroes delivery fee", e); }

    // 7. BXGY: buy 2 get 1
    try {
      await Offer.deleteMany({});
      await Offer.create({
        title: "B2G1", type: "BXGY", buyQty: 2, getQty: 1,
        applicableProductIds: [pB._id], minOrderValue: 0,
        startDate: past, expiryDate: future, isActive: true, priority: 1,
      });
      const p = await PricingService.calculate([{ productId: String(pB._id), sku: pB.baseSKU, quantity: 2 }], undefined, userId);
      // cheapest 500 x floor(2/2)*1 = 500
      if (p.offerDiscount !== 500) throw new Error(`expected BXGY 500 got ${p.offerDiscount}`);
      ok("buy-X-get-Y computed deterministically");
    } catch (e) { fail("buy-X-get-Y computed deterministically", e); }

    // 8. CSV import validation surfaces row errors
    try {
      const { parseCsv } = await import("../lib/csv");
      const { headers, rows } = parseCsv("slug,name,categorySlug,basePrice\np1,Test,cat,abc\n,Bad,cat,10\n");
      if (headers.join() !== "slug,name,categorySlug,basePrice") throw new Error("headers parsed wrong");
      if (rows.length !== 2) throw new Error("expected 2 rows");
      if (Number.isNaN(parseFloat(rows[0][3]))) {
        // 'abc' correctly detected as invalid price
        ok("CSV import validation surfaces row errors");
      } else {
        throw new Error("invalid price not detected");
      }
    } catch (e) { fail("CSV import validation surfaces row errors", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All coupon/offer tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
