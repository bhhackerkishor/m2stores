/**
 * Customer analytics — real User + Order aggregations. No third-party CDP metrics.
 */
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { resolveRange, roundMoney, pctChange, type RangeKey, type ResolvedRange } from "@/lib/analytics/dates";
import { paidMatch, paidMatchPrev, revenueGroupStage } from "@/lib/analytics/matches";

export interface CustomerOverview {
  range: ResolvedRange;
  totals: {
    customersAllTime: number;
    newCustomers: number;
    previousNewCustomers: number;
    newCustomersPct: number | null;
    customersWithOrders: number;
    customersWithPaidOrders: number;
    repeatCustomers: number;
    repeatRatePct: number | null;
    churned: number;
    activeInRange: number;
  };
  ordersPerCustomer: {
    avg: number | null;
    max: number | null;
  };
  segments: Array<{ segment: string; customers: number; revenue: number; orders: number }>;
  topCustomers: Array<{
    userId: string;
    name: string;
    email: string;
    orders: number;
    spent: number;
    lastOrderAt: string | null;
    segment: string;
  }>;
  newVsReturning: {
    newCustomers: number;
    returningCustomers: number;
    newOrders: number;
    returningOrders: number;
    newRevenue: number;
    returningRevenue: number;
  };
  series: Array<{ date: string; newCustomers: number; activeCustomers: number }>;
}

export class CustomerAnalyticsService {
  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<CustomerOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);

    const [
      allTimeCustomers,
      newCustomers,
      prevNewCustomers,
      paidAgg,
      repeatAgg,
      newVsReturningAgg,
      dailyUsers,
      dailyActive,
      topSpend,
    ] = await Promise.all([
      User.countDocuments({ role: "CUSTOMER" }),
      User.countDocuments({ role: "CUSTOMER", createdAt: { $gte: r.start, $lte: r.end } }),
      User.countDocuments({ role: "CUSTOMER", createdAt: { $gte: r.prevStart, $lte: r.prevEnd } }),
      Order.aggregate([
        { $match: paidMatch(r) },
        { $group: { _id: "$userId", orders: { $sum: 1 }, revenue: { $sum: "$pricingSnapshot.grandTotal" } } },
      ]),
      User.aggregate([
        {
          $lookup: {
            from: "orders",
            let: { uid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$uid"] },
                      { $eq: ["$paymentInfo.status", "PAID"] },
                      { $ne: ["$orderStatus", "CANCELLED"] },
                    ],
                  },
                },
              },
              { $group: { _id: null, n: { $sum: 1 } } },
            ],
            as: "orders",
          },
        },
        { $match: { role: "CUSTOMER", "orders.0": { $exists: true } } },
        { $project: { n: { $arrayElemAt: ["$orders.n", 0] } } },
        {
          $group: {
            _id: null,
            withOrders: { $sum: 1 },
            repeat: { $sum: { $cond: [{ $gte: ["$n", 2] }, 1, 0] } },
          },
        },
      ]),
      // new vs returning: first paid order before range start?
      (async () => {
        const paidIn = await Order.aggregate([
          { $match: paidMatch(r) },
          { $group: { _id: "$userId", orders: { $sum: 1 }, revenue: { $sum: "$pricingSnapshot.grandTotal" } } },
        ]);
        const beforeStart = await Order.aggregate([
          {
            $match: {
              "paymentInfo.status": "PAID",
              orderStatus: { $ne: "CANCELLED" },
              createdAt: { $lt: r.start },
            },
          },
          { $group: { _id: "$userId" } },
        ]);
        const prior = new Set(beforeStart.map((x: any) => String(x._id)));
        let newC = 0;
        let retC = 0;
        let newO = 0;
        let retO = 0;
        let newR = 0;
        let retR = 0;
        for (const row of paidIn as any[]) {
          const isNew = !prior.has(String(row._id));
          if (isNew) {
            newC++;
            newO += row.orders;
            newR += row.revenue;
          } else {
            retC++;
            retO += row.orders;
            retR += row.revenue;
          }
        }
        return { newC, retC, newO, retO, newR: roundMoney(newR), retR: roundMoney(retR) };
      })(),
      User.aggregate([
        {
          $match: { role: "CUSTOMER", createdAt: { $gte: r.start, $lte: r.end } },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: paidMatch(r) },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            users: { $addToSet: "$userId" },
          },
        },
      ]),
      Order.aggregate([
        { $match: paidMatch(r) },
        {
          $group: {
            _id: "$userId",
            revenue: { $sum: "$pricingSnapshot.grandTotal" },
            orders: { $sum: 1 },
            last: { $max: "$createdAt" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      ]),
    ]);

    void paidMatchPrev;
    void revenueGroupStage;

    const customersWithOrders = (repeatAgg[0] as any)?.withOrders || 0;
    const repeatCustomers = (repeatAgg[0] as any)?.repeat || 0;
    const repeatRatePct =
      customersWithOrders > 0 ? Math.round((repeatCustomers / customersWithOrders) * 1000) / 10 : null;

    // distinct customers with paid orders in range
    const activeSet = new Set((paidAgg as any[]).map((a) => String(a._id)));
    const ordersPerCustomer =
      activeSet.size > 0 ? Math.round(((paidAgg as any[]).reduce((s, a) => s + a.orders, 0) / activeSet.size) * 10) / 10 : null;
    const maxOrders = (paidAgg as any[]).length
      ? Math.max(...(paidAgg as any[]).map((a) => a.orders))
      : null;

    // segments by spend in range
    const spendBuckets = [
      { segment: "High value (₹10k+)", min: 10000, max: Infinity },
      { segment: "Mid (₹2.5k–10k)", min: 2500, max: 10000 },
      { segment: "Low (₹0–2.5k)", min: 0, max: 2500 },
    ];
    const segments = spendBuckets.map((b) => {
      const rows = (paidAgg as any[]).filter((a) => a.revenue >= b.min && a.revenue < b.max);
      return {
        segment: b.segment,
        customers: rows.length,
        revenue: roundMoney(rows.reduce((s, a) => s + a.revenue, 0)),
        orders: rows.reduce((s, a) => s + a.orders, 0),
      };
    });

    const nv = newVsReturningAgg as {
      newC: number;
      retC: number;
      newO: number;
      retO: number;
      newR: number;
      retR: number;
    };

    const newUserByDay = new Map((dailyUsers as any[]).map((d) => [d._id, d.count]));
    const activeByDay = new Map<string, number>();
    for (const row of dailyActive as any[]) {
      activeByDay.set(row._id, (row.users || []).length);
    }
    const series: CustomerOverview["series"] = [];
    for (let i = 0; i < r.days; i++) {
      const d = new Date(r.start.getTime() + i * 86400000);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      series.push({
        date: key,
        newCustomers: newUserByDay.get(key) || 0,
        activeCustomers: activeByDay.get(key) || 0,
      });
    }

    const churned = Math.max(0, allTimeCustomers - activeSet.size - newCustomers);
    void revenueGroupStage;

    const topCustomers = (topSpend as any[]).map((row) => ({
      userId: String(row._id),
      name: row.user?.name || "Unknown",
      email: row.user?.email || "",
      orders: row.orders,
      spent: roundMoney(row.revenue),
      lastOrderAt: row.last ? new Date(row.last).toISOString() : null,
      segment:
        row.revenue >= 10000 ? "High value" : row.revenue >= 2500 ? "Mid" : "Low",
    }));

    return {
      range: r,
      totals: {
        customersAllTime: allTimeCustomers,
        newCustomers,
        previousNewCustomers: prevNewCustomers,
        newCustomersPct: pctChange(newCustomers, prevNewCustomers),
        customersWithOrders,
        customersWithPaidOrders: customersWithOrders,
        repeatCustomers,
        repeatRatePct,
        churned,
        activeInRange: activeSet.size,
      },
      ordersPerCustomer: { avg: ordersPerCustomer, max: maxOrders },
      segments,
      topCustomers,
      newVsReturning: {
        newCustomers: nv?.newC || 0,
        returningCustomers: nv?.retC || 0,
        newOrders: nv?.newO || 0,
        returningOrders: nv?.retO || 0,
        newRevenue: nv?.newR || 0,
        returningRevenue: nv?.retR || 0,
      },
      series,
    };
  }
}
