/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { Payment } from "../models/Payment";
import { InventoryState } from "../models/Inventory";
import { DashboardService, resolveRange } from "../services/dashboard.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };

async function main() {
  console.log("🧪 Starting dashboard tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    // Range resolution
    try {
      const t = resolveRange("today");
      if (t.days !== 1) throw new Error("today should be 1 day");
      const w = resolveRange("7d");
      if (w.days !== 7) throw new Error("7d should be 7 days");
      const m = resolveRange("30d");
      if (m.days !== 30) throw new Error("30d should be 30 days");
      const q = resolveRange("90d");
      if (q.days !== 90) throw new Error("90d should be 90 days");
      ok("range resolution (today/7/30/90/custom)");
    } catch (e) { fail("range resolution (today/7/30/90/custom)", e); }

    const user: any = await User.create({ name: "Dash Tester", phone: `3${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const cat: any = await Category.create({ name: "Dash Cat", slug: `dash-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "Dash Product", slug: `dash-product-${Date.now()}`, description: "d", categoryId: cat._id,
      basePrice: 1000, salePrice: 800, baseSKU: "DASH-001", hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });
    await InventoryState.create({ productId: prod._id, sku: "DASH-001", stock: 1, reservedStock: 0, lowStockThreshold: 5 });

    const mkOrder = async (orderNumber: string, status: string, paid: boolean, total: number, daysAgo = 0) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const o: any = await Order.create({
        orderNumber, userId: user._id,
        items: [{ productId: prod._id, sku: "DASH-001", nameSnapshot: prod.name, imageSnapshot: "", attributesSnapshot: {}, unitPrice: 1000, salePrice: 800, taxRate: 18, taxAmount: 144, discountAmount: 200, quantity: 1, finalLineTotal: 800 }],
        shippingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        billingAddress: { fullName: "T", phone: "9876543210", addressLine1: "123", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
        pricingSnapshot: { subtotal: 800, itemsDiscount: 200, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 144, grandTotal: total },
        paymentInfo: { method: "PHONEPE", status: paid ? "PAID" : "PENDING" },
        orderStatus: status,
        statusHistory: [{ status, timestamp: d }],
        createdAt: d,
        idempotencyKey: `idem-${orderNumber}`,
      });
      await Order.updateOne({ _id: o._id }, { $set: { createdAt: d, updatedAt: d } });
      return o;
    };

    await mkOrder("DASH-PAID-1", "DELIVERED", true, 944, 0);
    await mkOrder("DASH-PAID-2", "CONFIRMED", true, 944, 1);
    await mkOrder("DASH-PEND-1", "PENDING_PAYMENT", false, 944, 0);
    await mkOrder("DASH-CAN-1", "CANCELLED", false, 944, 0);
    await Payment.create({ paymentId: "PAY-DASH-1", orderId: (await Order.findOne({ orderNumber: "DASH-PAID-1" }))!._id, provider: "PHONEPE", merchantTransactionId: "MTXN-DASH-1", amount: 944, currency: "INR", status: "PAID", rawWebhookLogs: [] });

    // Revenue counts only PAID non-cancelled
    try {
      const s: any = await DashboardService.stats("30d");
      if (s.kpis.periodRevenue !== 1888) throw new Error(`periodRevenue expected 1888 got ${s.kpis.periodRevenue}`);
      if (s.kpis.orders !== 4) throw new Error(`orders expected 4 got ${s.kpis.orders}`);
      if (s.kpis.delivered !== 1) throw new Error(`delivered expected 1 got ${s.kpis.delivered}`);
      if (s.kpis.cancelled !== 1) throw new Error(`cancelled expected 1 got ${s.kpis.cancelled}`);
      if (s.kpis.lowStock !== 1) throw new Error(`lowStock expected 1 got ${s.kpis.lowStock}`);
      ok("KPIs: paid-only revenue, status counts, low stock");
    } catch (e) { fail("KPIs: paid-only revenue, status counts, low stock", e); }

    // Series has 30 buckets summing to revenue
    try {
      const s: any = await DashboardService.stats("7d");
      if (s.series.length !== 7) throw new Error(`expected 7 buckets got ${s.series.length}`);
      const sum = s.series.reduce((a: number, b: any) => a + b.revenue, 0);
      if (sum !== 1888) throw new Error(`series sum expected 1888 got ${sum}`);
      ok("daily series buckets sum to revenue");
    } catch (e) { fail("daily series buckets sum to revenue", e); }

    // Top products + payment methods + statuses present
    try {
      const s: any = await DashboardService.stats("30d");
      if (!s.topProducts.length || s.topProducts[0].qty !== 2) throw new Error("top product qty expected 2");
      if (!s.paymentMethods.some((m: any) => m.method === "PHONEPE")) throw new Error("missing PHONEPE method");
      if (!s.orderStatuses.some((m: any) => m.status === "DELIVERED")) throw new Error("missing DELIVERED status");
      ok("top products, payment methods, status breakdown");
    } catch (e) { fail("top products, payment methods, status breakdown", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All dashboard tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
