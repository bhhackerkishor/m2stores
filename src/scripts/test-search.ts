/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Brand } from "../models/Brand";
import { Product } from "../models/Product";
import { InventoryState } from "../models/Inventory";
import { Order } from "../models/Order";
import { CatalogService } from "../services/catalog.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };

async function main() {
  console.log("🧪 Starting search & recommendation tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const cat: any = await Category.create({ name: "Search Cat", slug: `search-cat-${Date.now()}`, isActive: true });
    const brand: any = await Brand.create({ name: `SearchBrand${Date.now()}`, slug: `searchbrand-${Date.now()}` });
    const mk = async (name: string, extra: any = {}) =>
      Product.create({
        name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: `${name} description`, categoryId: cat._id, brandId: brand._id,
        basePrice: 1000, baseSKU: `${name.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [], averageRating: 0, totalReviews: 0, ...extra,
      });
    const galaxy: any = await mk("Samsung Galaxy Search", {
      tags: ["smartphone", "android"],
      variants: [],
      averageRating: 4.5, totalReviews: 100,
    });
    // Give galaxy a color variant for attribute filtering
    galaxy.hasVariants = true;
    galaxy.variants = [{ sku: `GLX-${Date.now()}`.toUpperCase(), attributes: { color: "Blue", storage: "128GB" }, price: 1000, isActive: true }];
    await galaxy.save();
    const shoes: any = await mk("Running Shoes Pro", { tags: ["shoes", "running"], averageRating: 3.2, totalReviews: 10 });
    const oos: any = await mk("Out Of Stock Item", { tags: ["rare"] });
    for (const [p, stock] of [[galaxy, 5], [shoes, 5], [oos, 0]] as any[]) {
      const sku = p.hasVariants ? p.variants[0].sku : p.baseSKU;
      await InventoryState.create({ productId: p._id, sku, stock, reservedStock: 0, lowStockThreshold: 1 });
    }

    // 1. Token/prefix search finds "galaxy" via partial "galax"
    try {
      const r: any = await CatalogService.listProducts({ q: "galax", limit: 10 });
      if (!r.items.some((p: any) => String(p._id) === String(galaxy._id))) throw new Error("prefix search missed galaxy");
      ok("token-prefix search matches partial keywords");
    } catch (e) { fail("token-prefix search matches partial keywords", e); }

    // 2. Multi-token: all tokens must match (android + galaxy)
    try {
      const r: any = await CatalogService.listProducts({ q: "galaxy android", limit: 10 });
      if (!r.items.some((p: any) => String(p._id) === String(galaxy._id))) throw new Error("multi-token missed");
      const r2: any = await CatalogService.listProducts({ q: "galaxy nonexistenttoken", limit: 10 });
      if (r2.items.some((p: any) => String(p._id) === String(galaxy._id))) throw new Error("all-tokens rule violated");
      ok("multi-token search requires every token");
    } catch (e) { fail("multi-token search requires every token", e); }

    // 3. Rating filter
    try {
      const r: any = await CatalogService.listProducts({ minRating: 4, limit: 10 });
      if (!r.items.some((p: any) => String(p._id) === String(galaxy._id))) throw new Error("galaxy should pass 4+");
      if (r.items.some((p: any) => String(p._id) === String(shoes._id))) throw new Error("shoes should fail 4+");
      ok("rating filter (min averageRating)");
    } catch (e) { fail("rating filter (min averageRating)", e); }

    // 4. Availability filter excludes OOS
    try {
      const r: any = await CatalogService.listProducts({ inStock: true, limit: 10 });
      if (r.items.some((p: any) => String(p._id) === String(oos._id))) throw new Error("OOS item leaked");
      if (!r.items.some((p: any) => String(p._id) === String(galaxy._id))) throw new Error("in-stock galaxy missing");
      ok("in-stock filter excludes zero-availability products");
    } catch (e) { fail("in-stock filter excludes zero-availability products", e); }

    // 5. Attribute filter (variant color)
    try {
      const r: any = await CatalogService.listProducts({ attrs: { color: ["Blue"] }, limit: 10 });
      if (!r.items.some((p: any) => String(p._id) === String(galaxy._id))) throw new Error("blue variant missing");
      if (r.items.some((p: any) => String(p._id) === String(shoes._id))) throw new Error("non-blue leaked");
      ok("variant-attribute filter (color/storage)");
    } catch (e) { fail("variant-attribute filter (color/storage)", e); }

    // 6. Facets reflect scope
    try {
      const f: any = await CatalogService.getFacets({ q: "galaxy" });
      if (f.total < 1) throw new Error("facet total wrong");
      if (!f.categories.some((c: any) => String(c.categoryId) === String(cat._id))) throw new Error("category facet missing");
      if (!f.attributes?.color?.some((v: any) => v.value === "Blue")) throw new Error("color facet missing Blue");
      ok("facets: categories, brands, attributes with counts");
    } catch (e) { fail("facets: categories, brands, attributes with counts", e); }

    // 7. Pagination math
    try {
      const p1: any = await CatalogService.listProducts({ limit: 2, page: 1 });
      const p2: any = await CatalogService.listProducts({ limit: 2, page: 2 });
      if (p1.total < 3) throw new Error("need >=3 products");
      if (p1.items[0]._id.toString() === p2.items[0]._id.toString()) throw new Error("pages overlap");
      if (p1.totalPages !== Math.ceil(p1.total / 2)) throw new Error("totalPages wrong");
      ok("server-side pagination (no full-collection fetch)");
    } catch (e) { fail("server-side pagination (no full-collection fetch)", e); }

    // 8. Frequently bought together from paid co-orders
    try {
      const user: any = await User.create({ name: "FBT", phone: `9${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
      const snap = (p: any, qty = 1) => ({ productId: p._id, sku: p.hasVariants ? p.variants[0].sku : p.baseSKU, nameSnapshot: p.name, imageSnapshot: "", attributesSnapshot: {}, unitPrice: 1000, salePrice: 1000, taxRate: 18, taxAmount: 180, discountAmount: 0, quantity: qty, finalLineTotal: 1000 * qty });
      const addr: any = { fullName: "T", phone: "9876543210", addressLine1: "123", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" };
      const price: any = { subtotal: 2000, itemsDiscount: 0, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 360, grandTotal: 2360 };
      await Order.create({
        orderNumber: `FBT-${Date.now()}-1`, userId: user._id, items: [snap(galaxy), snap(shoes)],
        shippingAddress: addr, billingAddress: addr, pricingSnapshot: price,
        paymentInfo: { method: "COD", status: "PAID" }, orderStatus: "DELIVERED",
        statusHistory: [{ status: "DELIVERED", timestamp: new Date() }], idempotencyKey: `idem-fbt-${Date.now()}-1`,
      });
      const fbt: any[] = await CatalogService.frequentlyBoughtTogether(String(galaxy._id), 4);
      if (!fbt.some((p: any) => String(p._id) === String(shoes._id))) throw new Error("co-purchased shoes missing");
      ok("frequently-bought-together from paid co-orders");
    } catch (e) { fail("frequently-bought-together from paid co-orders", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All search tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
