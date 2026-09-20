import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { InventoryState } from "@/models/Inventory";

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

// Store timezone: Asia/Kolkata. All range boundaries AND daily buckets use
// IST consistently — mixing server-local midnights with UTC bucketing drops
// the current day (buckets summed to less than revenue).
const IST_OFFSET_MS = 5.5 * 3600_000;

function istDayStart(d: Date): Date {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

const istDayKey = (() => {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  return (d: Date) => fmt.format(d);
})();

export function resolveRange(range: RangeKey, from?: string, to?: string): { start: Date; end: Date; days: number } {
  const endBase = to ? new Date(to) : new Date();
  const endDay = istDayStart(endBase);
  const end = new Date(endDay.getTime() + 86400000 - 1);
  let start: Date;
  let days: number;
  switch (range) {
    case "today":
      start = endDay;
      days = 1;
      break;
    case "7d":
      start = new Date(endDay.getTime() - 6 * 86400000);
      days = 7;
      break;
    case "90d":
      start = new Date(endDay.getTime() - 89 * 86400000);
      days = 90;
      break;
    case "custom":
      start = from ? istDayStart(new Date(from)) : endDay;
      days = Math.max(1, Math.round((endDay.getTime() - start.getTime()) / 86400000) + 1);
      break;
    case "30d":
    default:
      start = new Date(endDay.getTime() - 29 * 86400000);
      days = 30;
      break;
  }
  return { start, end, days };
}

const dayKey = istDayKey;

export class DashboardService {
  static async stats(range: RangeKey = "30d", from?: string, to?: string) {
    await connectDB();
    const { start, end, days } = resolveRange(range, from, to);

    const rangeMatch = { createdAt: { $gte: start, $lte: end } };
    const paidMatch = { "paymentInfo.status": "PAID", orderStatus: { $ne: "CANCELLED" }, ...rangeMatch };

    const [
      revenueAgg,
      totalRevenueAgg,
      ordersCount,
      pendingCount,
      deliveredCount,
      cancelledCount,
      customersTotal,
      customersNew,
      lowStockCount,
      refundsAgg,
      statusAgg,
      methodAgg,
      topItems,
      dailyAgg,
    ] = await Promise.all([
      Order.aggregate([
        { $match: paidMatch },
        { $group: { _id: null, revenue: { $sum: "$pricingSnapshot.grandTotal" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { "paymentInfo.status": "PAID", orderStatus: { $ne: "CANCELLED" } } },
        { $group: { _id: null, revenue: { $sum: "$pricingSnapshot.grandTotal" }, orders: { $sum: 1 } } },
      ]),
      Order.countDocuments(rangeMatch),
      Order.countDocuments({ ...rangeMatch, orderStatus: { $in: ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "PACKED"] } }),
      Order.countDocuments({ ...rangeMatch, orderStatus: "DELIVERED" }),
      Order.countDocuments({ ...rangeMatch, orderStatus: "CANCELLED" }),
      User.countDocuments({ role: "CUSTOMER" }),
      User.countDocuments({ role: "CUSTOMER", createdAt: { $gte: start, $lte: end } }),
      InventoryState.countDocuments({ $expr: { $lt: [{ $subtract: ["$stock", "$reservedStock"] }, "$lowStockThreshold"] } }),
      Payment.aggregate([
        { $match: { status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] }, updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, amount: { $sum: "$refundDetails.amount" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([{ $match: rangeMatch }, { $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: rangeMatch }, { $group: { _id: "$paymentInfo.method", count: { $sum: 1 }, revenue: { $sum: "$pricingSnapshot.grandTotal" } } }]),
      Order.aggregate([
        { $match: paidMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: { productId: "$items.productId", name: "$items.nameSnapshot", image: "$items.imageSnapshot" },
            qty: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.finalLineTotal" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: paidMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            revenue: { $sum: "$pricingSnapshot.grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Fill daily buckets (including zero days) — IST-aligned with the query above
    const byDay = new Map((dailyAgg as any[]).map((d) => [d._id, d]));
    const series: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const key = dayKey(d);
      const hit: any = byDay.get(key);
      series.push({ date: key, revenue: Math.round((hit?.revenue || 0) * 100) / 100, orders: hit?.orders || 0 });
    }

    // Category breakdown from top items' live products (best-effort)
    let categories: Array<{ name: string; revenue: number }> = [];
    try {
      const topPids = (topItems as any[]).map((t) => t._id.productId).filter(Boolean);
      const prods: any[] = topPids.length ? await Product.find({ _id: { $in: topPids } }).select("categoryId").lean() : [];
      const catIds = [...new Set(prods.map((p) => String(p.categoryId)).filter(Boolean))];
      const cats: any[] = catIds.length ? await Category.find({ _id: { $in: catIds } }).select("name").lean() : [];
      const catName = new Map(cats.map((c: any) => [String(c._id), c.name]));
      const prodCat = new Map(prods.map((p: any) => [String(p._id), catName.get(String(p.categoryId)) || "Uncategorized"]));
      const byCat = new Map<string, number>();
      for (const t of topItems as any[]) {
        const name = prodCat.get(String(t._id.productId)) || "Uncategorized";
        byCat.set(name, (byCat.get(name) || 0) + t.revenue);
      }
      categories = [...byCat.entries()].map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }));
    } catch {
      categories = [];
    }

    return {
      range: { key: range, start, end, days },
      kpis: {
        periodRevenue: Math.round(((revenueAgg[0]?.revenue || 0) as number) * 100) / 100,
        periodOrders: revenueAgg[0]?.orders || 0,
        totalRevenue: Math.round(((totalRevenueAgg[0]?.revenue || 0) as number) * 100) / 100,
        totalOrders: totalRevenueAgg[0]?.orders || 0,
        orders: ordersCount,
        pending: pendingCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
        customersTotal,
        customersNew,
        lowStock: lowStockCount,
        refundsAmount: Math.round(((refundsAgg[0]?.amount || 0) as number) * 100) / 100,
        refundsCount: refundsAgg[0]?.count || 0,
      },
      series,
      topProducts: (topItems as any[]).map((t) => ({
        productId: String(t._id.productId),
        name: t._id.name,
        image: t._id.image,
        qty: t.qty,
        revenue: Math.round(t.revenue * 100) / 100,
      })),
      categories,
      paymentMethods: (methodAgg as any[]).map((m) => ({ method: m._id || "UNKNOWN", count: m.count, revenue: Math.round(m.revenue * 100) / 100 })),
      orderStatuses: (statusAgg as any[]).map((s) => ({ status: s._id, count: s.count })),
    };
  }
}
