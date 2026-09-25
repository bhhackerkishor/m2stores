/* eslint-disable no-console */
/**
 * Verifies the three user-reported fixes:
 *   1. Variant attributes visible per cart line + variants stay separate lines
 *   2. Parent category pages include descendant + subcategory products
 *   3. Delivery/COD pincode modes (allowlist/blocklist/all) gate checkout
 *
 * Usage: npx tsx src/scripts/test-delivery-category.ts
 */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { InventoryState } from "../models/Inventory";
import { Setting } from "../models/Setting";
import { User } from "../models/User";
import { CartService } from "../services/cart.service";
import { AddressService } from "../services/address.service";
import { CheckoutService } from "../services/checkout.service";
import { CatalogService } from "../services/catalog.service";
import { ShippingService, matchPincodeRule } from "../services/shipping.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };
const expect = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };

const TN = ["600", "601", "641"];

async function main() {
  console.log("🧪 Starting delivery/category/variant tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    // ---------- 1. matchPincodeRule (pure) ----------
    try {
      expect(matchPincodeRule("110001", "all", [], [], []).ok, "all-mode should pass");
      expect(matchPincodeRule("600028", "allowlist", [], TN, []).ok, "TN prefix should pass allowlist");
      expect(!matchPincodeRule("110001", "allowlist", [], TN, []).ok, "non-TN should fail allowlist");
      expect(matchPincodeRule("110001", "allowlist", ["110001"], [], []).ok, "exact allow should pass");
      expect(!matchPincodeRule("600028", "blocklist", [], [], ["600028"]).ok, "blocked exact pin should fail");
      expect(matchPincodeRule("600031", "blocklist", [], [], ["600028"]).ok, "non-blocked pin should pass blocklist");
      // stale allowlist prefixes must not become blocks when mode flips
      expect(matchPincodeRule("600028", "blocklist", [], TN, []).ok, "stale allowed prefixes must not block in blocklist mode");
      expect(matchPincodeRule("", "allowlist", [], TN, []).ok, "empty pincode must not block");
      // inference fallback: lists present, no mode field
      expect(matchPincodeRule("600028", undefined, [], TN, []).ok, "inferred allowlist passes TN");
      expect(!matchPincodeRule("560001", undefined, [], TN, []).ok, "inferred allowlist rejects non-TN");
      ok("matchPincodeRule modes (all/allowlist/blocklist + inference)");
    } catch (e) { fail("matchPincodeRule modes (all/allowlist/blocklist + inference)", e); }

    // ---------- 2. Setting: allowlist TN for delivery + COD ----------
    try {
      await Setting.create({
        storeName: "T", isCODEnabled: true, codMinOrderValue: 0, codMaxOrderValue: 50000, codFee: 0,
        codPincodeMode: "allowlist", codAllowedPrefixes: TN, codAllowedPincodes: [], codBlockedPincodes: [],
        deliveryPincodeMode: "allowlist", deliveryAllowedPrefixes: TN, deliveryAllowedPincodes: [], deliveryBlockedPincodes: [],
        codDaysCal: 3,
      });
      const d1 = await ShippingService.checkDelivery("600028");
      const d2 = await ShippingService.checkDelivery("110001");
      expect(d1.deliverable, "TN pincode should be deliverable");
      expect(!d2.deliverable, "non-TN pincode should be rejected");
      const c1 = await ShippingService.checkCOD(1000, "600001");
      const c2 = await ShippingService.checkCOD(1000, "400001");
      expect(c1.eligible, "TN COD should be eligible");
      expect(!c2.eligible, "non-TN COD should be rejected");
      const c3 = await ShippingService.checkCOD(999999, "600001");
      expect(!c3.eligible, "COD over max should be rejected");
      ok("ShippingService checkDelivery/checkCOD honor allowlist modes");
    } catch (e) { fail("ShippingService checkDelivery/checkCOD honor allowlist modes", e); }

    // ---------- 3. Checkout validate blocks undeliverable pincode ----------
    const user: any = await User.create({ name: "DT", phone: `9${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const userId = String(user._id);
    try {
      const cat: any = await Category.create({ name: "DC Root", slug: `dc-root-${Date.now()}`, isActive: true });
      const prod: any = await Product.create({
        name: "DC Product", slug: `dc-product-${Date.now()}`, description: "d",
        categoryId: cat._id, basePrice: 500, salePrice: 500, baseSKU: "DC-001",
        hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
      });
      await InventoryState.create({ productId: prod._id, sku: "DC-001", stock: 10, reservedStock: 0, lowStockThreshold: 2 });
      await CartService.add({ userId, isGuest: false }, { productId: String(prod._id), sku: "DC-001", quantity: 1 });

      const tnAddr: any = await AddressService.create(userId, { name: "A", phone: "9876543210", addressLine1: "12 St", city: "Chennai", state: "Tamil Nadu", pincode: "600028", country: "India" });
      const dlAddr: any = await AddressService.create(userId, { name: "B", phone: "9876543211", addressLine1: "12 St", city: "Delhi", state: "Delhi", pincode: "110001", country: "India" });

      await CheckoutService.validate({ userId, addressId: String(tnAddr._id), paymentMethod: "PHONEPE" });
      ok("checkout validate passes for TN (deliverable) address");

      let code = "";
      try {
        await CheckoutService.validate({ userId, addressId: String(dlAddr._id), paymentMethod: "PHONEPE" });
      } catch (e: any) { code = e?.code || ""; }
      expect(code === "DELIVERY_UNAVAILABLE", `expected DELIVERY_UNAVAILABLE, got "${code}"`);
      ok("checkout validate rejects undeliverable pincode (DELIVERY_UNAVAILABLE)");
    } catch (e) { fail("checkout delivery gate", e); }

    // ---------- 4. Category descendants + subcategory products ----------
    try {
      const stamp = Date.now();
      const root: any = await Category.create({ name: "DCRoot", slug: `dc-r-${stamp}`, isActive: true });
      const child: any = await Category.create({ name: "DCChild", slug: `dc-c-${stamp}`, isActive: true, parentCategoryId: root._id, level: 1 });
      const grand: any = await Category.create({ name: "DCGrand", slug: `dc-g-${stamp}`, isActive: true, parentCategoryId: child._id, level: 2 });
      const sibling: any = await Category.create({ name: "DCSib", slug: `dc-s-${stamp}`, isActive: true, level: 0 });

      const mk = (name: string, categoryId: any, subcategoryId?: any) =>
        Product.create({
          name, slug: `dc-${name}-${stamp}`, description: "d", categoryId,
          ...(subcategoryId ? { subcategoryId } : {}),
          basePrice: 100, salePrice: 100, baseSKU: `SKU-${name}-${stamp}`,
          hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
        });
      await mk("P-root", root._id);
      await mk("P-child", child._id);
      await mk("P-grand", grand._id);
      await mk("P-sib", sibling._id);
      await mk("P-sub", child._id, root._id); // subcategory product under root

      const ids = await CatalogService.collectCategoryIds(String(root._id));
      expect(ids.length === 3, `root family should be 3 ids, got ${ids.length}`);
      expect(ids.includes(String(sibling._id)) === false, "sibling must not be included");

      const res = await CatalogService.listProducts({ categoryId: String(root._id), limit: 50, page: 1 });
      const names = (res.items as any[]).map((p) => p.name).sort();
      expect(names.includes("P-root"), "root product missing");
      expect(names.includes("P-child"), "child-descendant product missing");
      expect(names.includes("P-grand"), "grandchild product missing");
      expect(names.includes("P-sub"), "subcategory product missing on parent page");
      expect(!names.includes("P-sib"), "sibling product should not appear");
      ok("parent category page lists descendant + subcategory products, excludes siblings");
    } catch (e) { fail("category descendant expansion", e); }

    // ---------- 5. Variants stay separate cart lines with attributes ----------
    try {
      const stamp = Date.now();
      const cat: any = await Category.create({ name: "V Cat", slug: `v-cat-${stamp}`, isActive: true });
      const prod: any = await Product.create({
        name: "Shirt", slug: `shirt-${stamp}`, description: "d", categoryId: cat._id,
        basePrice: 499, salePrice: 499, baseSKU: "SHIRT-BASE", hasVariants: true,
        status: "PUBLISHED", taxRate: 5, images: [],
        variants: [
          { sku: "SHIRT-S", price: 499, attributes: { Size: "S", Color: "Blue" }, isActive: true },
          { sku: "SHIRT-M", price: 549, attributes: { Size: "M", Color: "Blue" }, isActive: true },
        ],
      });
      await InventoryState.create({ productId: prod._id, sku: "SHIRT-S", stock: 5, reservedStock: 0, lowStockThreshold: 1 });
      await InventoryState.create({ productId: prod._id, sku: "SHIRT-M", stock: 5, reservedStock: 0, lowStockThreshold: 1 });

      const identity = { userId, isGuest: false };
      await CartService.add(identity, { productId: String(prod._id), sku: "SHIRT-S", quantity: 1 });
      await CartService.add(identity, { productId: String(prod._id), sku: "SHIRT-M", quantity: 1 });
      await CartService.add(identity, { productId: String(prod._id), sku: "SHIRT-S", quantity: 1 }); // same variant merges

      const view: any = await CartService.view(identity);
      const lineS = view.items.find((i: any) => i.sku === "SHIRT-S");
      const lineM = view.items.find((i: any) => i.sku === "SHIRT-M");
      expect(view.items.length >= 2, `S and M must be separate lines, got ${view.items.length}`);
      expect(lineS?.quantity === 2, `same variant should merge qty, got ${lineS?.quantity}`);
      expect(lineM?.quantity === 1, `M line qty wrong: ${lineM?.quantity}`);
      expect(lineS?.attributes?.Size === "S", "S line missing Size=S attribute");
      expect(lineM?.attributes?.Size === "M", "M line missing Size=M attribute");
      ok("variant SKUs stay separate lines with attributes; same SKU merges qty");
    } catch (e) { fail("variant cart lines", e); }
  } finally {
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
