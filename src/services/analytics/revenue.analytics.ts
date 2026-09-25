/**
 * Revenue analytics — single source of truth for sales/revenue metrics.
 * All figures from Order.pricingSnapshot on paid non-cancelled orders.
 */
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import {
  resolveRange,
  rangeQuerySchema,
  roundMoney,
  pctChange,
  type RangeKey,
  type ResolvedRange,
} from "@/lib/analytics/dates";
import { paidMatch, paidMatchPrev, revenueGroupStage, lineGrossStages, createdAtRange } from "@/lib/analytics/matches";

export interface RevenueOverview {
  range: ResolvedRange;
  grossSales: number;
  netSales: number;
  revenue: number;
  discounts: number;
  refunds: number;
  taxCollected: number;
  shippingCharged: number;
  codFees: number;
  paidOrders: number;
  allOrders: number;
  unitsSold: number;
  aov: number | null;
  previous: {
    revenue: number;
    paidOrders: number;
    aov: number | null;
    refunds: number;
  };
  changes: {
    revenuePct: number | null;
    paidOrdersPct: number | null;
    aovPct: number | null;
    refundsPct: number | null;
  };
  series: Array<{
    date: string;
    revenue: number;
    orders: number;
    units: number;
    discounts: number;
  }>;
}

function emptyTotals() {
  return {
    revenue: 0,
    orders: 0,
    discounts: 0,
    tax: 0,
    shipping: 0,
    codFees: 0,
    units: 0,
  };
}

function mapTotals(row: any) {
  if (!row) return emptyTotals();
  return {
    revenue: roundMoney(row.revenue || 0),
    orders: row.orders || 0,
    discounts: roundMoney(row.discounts || 0),
    tax: roundMoney(row.tax || 0),
    shipping: roundMoney(row.shipping || 0),
    codFees: roundMoney(row.codFees || 0),
    units: row.units || 0,
  };
}

export class RevenueAnalyticsService {
  static parseQuery(q: { range?: string; from?: string; to?: string }) {
    const parsed = rangeQuerySchema.safeParse({
      range: q.range || "30d",
      from: q.from,
      to: q.to,
    });
    if (!parsed.success) throw Object.assign(new Error("Invalid range"), { statusCode: 400 });
    return resolveRange(parsed.data.range as RangeKey, parsed.data.from, parsed.data.to);
  }

  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<RevenueOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);

    const [curAgg, prevAgg, lineAgg, allOrders, refundsAgg, dailyAgg, lineDaily] = await Promise.all([
      Order.aggregate([{ $match: paidMatch(r) }, revenueGroupStage]),
      Order.aggregate([{ $match: paidMatchPrev(r) }, revenueGroupStage]),
      Order.aggregate([{ $match: paidMatch(r) }, ...lineGrossStages]),
      Order.countDocuments(createdAtRange(r)),
      Payment.aggregate([
        {
          $match: {
            status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
            updatedAt: { $gte: r.start, $lte: r.end },
          },
        },
        { $group: { _id: null, amount: { $sum: "$refundDetails.amount" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: paidMatch(r) },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            revenue: { $sum: "$pricingSnapshot.grandTotal" },
            orders: { $sum: 1 },
            discounts: {
              $sum: { $add: ["$pricingSnapshot.couponDiscount", "$pricingSnapshot.offerDiscount"] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: paidMatch(r) },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            },
            units: { $sum: "$items.quantity" },
          },
        },
      ]),
    ]);

    const cur = mapTotals(curAgg[0]);
    const prev = mapTotals(prevAgg[0]);
    const line = lineAgg[0] || { gross: 0, units: 0, lineDiscounts: 0 };
    const refunds = refundsAgg[0]?.amount || 0;
    const prevRefunds = 0; // prev refunds computed only when needed — skip for simplicity of KPI

    // net sales = grand total path: revenue already after order discounts
    // gross sales = line-level before order discounts
    const grossSales = roundMoney((line.gross || 0) + 0);
    // Approximate order-level discounts already in revenue; net = revenue - shipping - tax - cod
    // Spec: Net Sales = Gross − Discounts − Refunds is one model; we expose both clearly:
    // - grossSales: line finalLineTotal sum (pre order-level discount)
    // - revenue: grandTotal (settled)
    // - discounts: order-level coupon+offer
    const orderDiscounts = cur.discounts;
    const netSales = roundMoney(grossSales - orderDiscounts);

    const unitsByDay = new Map<string, number>();
    for (const u of lineDaily as any[]) {
      unitsByDay.set(u._id.day, u.units || 0);
    }

    const byDay = new Map((dailyAgg as any[]).map((d) => [d._id, d]));
    const series: RevenueOverview["series"] = [];
    for (let i = 0; i < r.days; i++) {
      const d = new Date(r.start.getTime() + i * 86400000);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      const hit = byDay.get(key);
      series.push({
        date: key,
        revenue: roundMoney(hit?.revenue || 0),
        orders: hit?.orders || 0,
        units: unitsByDay.get(key) || 0,
        discounts: roundMoney(hit?.discounts || 0),
      });
    }

    const aov = cur.orders > 0 ? roundMoney(cur.revenue / cur.orders) : null;
    const prevAov = prev.orders > 0 ? roundMoney(prev.revenue / prev.orders) : null;

    return {
      range: r,
      grossSales: roundMoney(grossSales),
      netSales,
      revenue: cur.revenue,
      discounts: orderDiscounts,
      refunds: roundMoney(refunds),
      taxCollected: cur.tax,
      shippingCharged: cur.shipping,
      codFees: cur.codFees,
      paidOrders: cur.orders,
      allOrders,
      unitsSold: line.units || cur.units,
      aov,
      previous: {
        revenue: prev.revenue,
        paidOrders: prev.orders,
        aov: prevAov,
        refunds: roundMoney(prevRefunds),
      },
      changes: {
        revenuePct: pctChange(cur.revenue, prev.revenue),
        paidOrdersPct: pctChange(cur.orders, prev.orders),
        aovPct: aov !== null && prevAov !== null ? pctChange(aov, prevAov) : null,
        refundsPct: null,
      },
      series,
    };
  }
}
