/**
 * Order analytics — statuses, funnel, value distribution from real Order docs.
 */
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { resolveRange, roundMoney, type RangeKey, type ResolvedRange } from "@/lib/analytics/dates";
import { createdAtRange, paidMatch } from "@/lib/analytics/matches";

const FUNNEL_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export interface OrderAnalyticsOverview {
  range: ResolvedRange;
  totals: {
    all: number;
    paid: number;
    pendingPayment: number;
    cancelled: number;
    processing: number;
    packed: number;
    shipped: number;
    outForDelivery: number;
    delivered: number;
    returnRequested: number;
    returnApproved: number;
    returned: number;
    refundPending: number;
    refunded: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  funnel: Array<{ status: string; count: number; dropoffFromPrev: number | null }>;
  value: {
    aov: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
    histogram: Array<{ bucket: string; from: number; to: number; count: number }>;
  };
  series: Array<{ date: string; orders: number; paid: number }>;
}

function bucketFor(v: number): { bucket: string; from: number; to: number } {
  if (v < 500) return { bucket: "₹0–499", from: 0, to: 499 };
  if (v < 1000) return { bucket: "₹500–999", from: 500, to: 999 };
  if (v < 2500) return { bucket: "₹1k–2.5k", from: 1000, to: 2499 };
  if (v < 5000) return { bucket: "₹2.5k–5k", from: 2500, to: 4999 };
  if (v < 10000) return { bucket: "₹5k–10k", from: 5000, to: 9999 };
  return { bucket: "₹10k+", from: 10000, to: Number.MAX_SAFE_INTEGER };
}

export class OrderAnalyticsService {
  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<OrderAnalyticsOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);
    const match = createdAtRange(r);

    const [statusAgg, allCount, paidCount, paidDocs, dailyAgg] = await Promise.all([
      Order.aggregate([{ $match: match }, { $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
      Order.countDocuments(match),
      Order.countDocuments(paidMatch(r)),
      Order.find(paidMatch(r))
        .select("pricingSnapshot.grandTotal")
        .lean(),
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
              paid: {
                $cond: [
                  { $and: [{ $eq: ["$paymentInfo.status", "PAID"] }, { $ne: ["$orderStatus", "CANCELLED"] }] },
                  1,
                  0,
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatusMap = new Map((statusAgg as any[]).map((s) => [s._id, s.count]));
    const countOf = (s: string) => byStatusMap.get(s) || 0;

    // Funnel: cumulative “reached at least this stage” is not stored — use stage counts
    // (status is current, not historical peak). Documented limitation.
    let prev: number | null = null;
    const funnel = FUNNEL_STATUSES.map((status) => {
      const count = countOf(status);
      const drop = prev !== null && prev > 0 ? Math.round(((prev - count) / prev) * 1000) / 10 : null;
      prev = count;
      return { status, count, dropoffFromPrev: drop };
    });

    const totalsArr = (paidDocs as any[]).map((d) => d.pricingSnapshot?.grandTotal || 0).sort((a, b) => a - b);
    const aov = totalsArr.length ? roundMoney(totalsArr.reduce((s, v) => s + v, 0) / totalsArr.length) : null;
    const median = totalsArr.length
      ? totalsArr.length % 2 === 1
        ? totalsArr[Math.floor(totalsArr.length / 2)]
        : roundMoney((totalsArr[totalsArr.length / 2 - 1] + totalsArr[totalsArr.length / 2]) / 2)
      : null;
    const min = totalsArr.length ? totalsArr[0] : null;
    const max = totalsArr.length ? totalsArr[totalsArr.length - 1] : null;

    const histDefs = [
      { bucket: "₹0–499", from: 0, to: 499 },
      { bucket: "₹500–999", from: 500, to: 999 },
      { bucket: "₹1k–2.5k", from: 1000, to: 2499 },
      { bucket: "₹2.5k–5k", from: 2500, to: 4999 },
      { bucket: "₹5k–10k", from: 5000, to: 9999 },
      { bucket: "₹10k+", from: 10000, to: Number.MAX_SAFE_INTEGER },
    ];
    const histogram = histDefs.map((h) => ({
      ...h,
      count: totalsArr.filter((v) => v >= h.from && v <= h.to).length,
    }));
    void bucketFor;

    const paidByDay = new Map<string, number>();
    const allByDay = new Map<string, number>();
    for (const row of dailyAgg as any[]) {
      const day = row._id.day;
      allByDay.set(day, (allByDay.get(day) || 0) + row.count);
      if (row._id.paid) paidByDay.set(day, (paidByDay.get(day) || 0) + row.count);
    }
    const series: OrderAnalyticsOverview["series"] = [];
    for (let i = 0; i < r.days; i++) {
      const d = new Date(r.start.getTime() + i * 86400000);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      series.push({ date: key, orders: allByDay.get(key) || 0, paid: paidByDay.get(key) || 0 });
    }

    return {
      range: r,
      totals: {
        all: allCount,
        paid: paidCount,
        pendingPayment: countOf("PENDING_PAYMENT"),
        cancelled: countOf("CANCELLED"),
        processing: countOf("PROCESSING"),
        packed: countOf("PACKED"),
        shipped: countOf("SHIPPED"),
        outForDelivery: countOf("OUT_FOR_DELIVERY"),
        delivered: countOf("DELIVERED"),
        returnRequested: countOf("RETURN_REQUESTED"),
        returnApproved: countOf("RETURN_APPROVED"),
        returned: countOf("RETURNED"),
        refundPending: countOf("REFUND_PENDING"),
        refunded: countOf("REFUNDED"),
      },
      byStatus: statusAgg.map((s: any) => ({ status: s._id || "UNKNOWN", count: s.count })),
      funnel,
      value: { aov, median, min, max, histogram },
      series,
    };
  }
}
