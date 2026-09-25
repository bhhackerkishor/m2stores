/**
 * Executive overview — single payload for the admin home dashboard.
 * Combines revenue + action center + light inventory/payments health.
 * Read-only; never mutates operational data.
 */
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { resolveRange, roundMoney, pctChange, type RangeKey, type ResolvedRange } from "@/lib/analytics/dates";
import { paidMatch, paidMatchPrev, revenueGroupStage } from "@/lib/analytics/matches";
import { RevenueAnalyticsService, type RevenueOverview } from "./revenue.analytics";
import { ActionCenterService, type ActionItem } from "./action-center";
import { InventoryAnalyticsService } from "./inventory.analytics";
import { PaymentAnalyticsService } from "./payment.analytics";
import { METRICS, type MetricId } from "@/lib/analytics/metrics";

export interface ExecutiveKpi {
  id: MetricId;
  label: string;
  value: number | null;
  display: string;
  previous: number | null;
  changePct: number | null;
  definition: string;
  caveat?: string;
}

export interface ExecutiveOverview {
  range: ResolvedRange;
  generatedAt: string;
  kpis: ExecutiveKpi[];
  revenue: RevenueOverview;
  actionCenter: ActionItem[];
  orderHealth: {
    pendingPayment: number;
    processing: number;
    packed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refundPending: number;
  };
  inventoryHealth: {
    lowStockSkus: number;
    outOfStockSkus: number;
    inventoryValue: number;
  };
  paymentHealth: {
    successRate: number | null;
    failed24h: number;
    stuckRefunds: number;
  };
  customerHealth: {
    totalCustomers: number;
    newCustomers: number;
    activeInRange: number;
  };
  methodology: string[];
}

function fmtCurrency(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "Data unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCount(n: number | null): string {
  if (n === null) return "Data unavailable";
  return new Intl.NumberFormat("en-IN").format(n);
}

function kpi(id: MetricId, value: number | null, previous: number | null): ExecutiveKpi {
  const def = METRICS[id];
  return {
    id,
    label: def.label,
    value,
    display:
      def.unit === "currency"
        ? fmtCurrency(value)
        : def.unit === "percent"
          ? value === null
            ? "Data unavailable"
            : `${value}%`
          : fmtCount(value),
    previous,
    changePct: value !== null && previous !== null ? pctChange(value, previous) : null,
    definition: def.definition,
    caveat: def.caveat,
  };
}

export class ExecutiveDashboardService {
  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<ExecutiveOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);

    const [revenue, actions, inventory, payments, statusAgg, customers, newCustomers, activeAgg, failed24h, stuckRefunds] =
      await Promise.all([
        RevenueAnalyticsService.overview(range, from, to),
        ActionCenterService.list(range),
        InventoryAnalyticsService.overview(range, from, to),
        PaymentAnalyticsService.overview(range, from, to),
        Order.aggregate([
          {
            $match: { createdAt: { $gte: r.start, $lte: r.end } },
          },
          { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ]),
        User.countDocuments({ role: "CUSTOMER" }),
        User.countDocuments({ role: "CUSTOMER", createdAt: { $gte: r.start, $lte: r.end } }),
        Order.aggregate([{ $match: paidMatch(r) }, { $group: { _id: "$userId" } }, { $count: "n" }]),
        Payment.countDocuments({ status: "FAILED", createdAt: { $gte: new Date(Date.now() - 86400000) } }),
        Payment.countDocuments({
          "refundDetails.status": { $in: ["REFUND_PENDING", "PENDING", "PROCESSING"] },
          "refundDetails.initiatedAt": { $lte: new Date(Date.now() - 48 * 3600_000) },
        }),
      ]);

    // previous-period paid orders for order KPI
    const prevPaid = await Order.aggregate([{ $match: paidMatchPrev(r) }, revenueGroupStage]);
    const prevOrders = prevPaid[0]?.orders || 0;
    const prevCustomersNew = await User.countDocuments({
      role: "CUSTOMER",
      createdAt: { $gte: r.prevStart, $lte: r.prevEnd },
    });
    const prevRevenue = prevPaid[0]?.revenue || 0;

    const statusMap = new Map((statusAgg as any[]).map((s) => [s._id, s.count]));
    const c = (s: string) => statusMap.get(s) || 0;

    const kpis: ExecutiveKpi[] = [
      kpi("revenue", revenue.revenue, prevRevenue),
      kpi("paid_orders", revenue.paidOrders, prevOrders),
      kpi("aov", revenue.aov, prevOrders > 0 ? roundMoney(prevRevenue / prevOrders) : null),
      kpi("net_sales", revenue.netSales, null),
      kpi("refunds", revenue.refunds, null),
      kpi("units_sold", revenue.unitsSold, null),
      kpi("customers_new", newCustomers, prevCustomersNew),
      kpi("low_stock_skus", inventory.totals.lowStockSkus, null),
    ];

    return {
      range: r,
      generatedAt: new Date().toISOString(),
      kpis,
      revenue,
      actionCenter: actions,
      orderHealth: {
        pendingPayment: c("PENDING_PAYMENT") + c("CONFIRMED"),
        processing: c("PROCESSING"),
        packed: c("PACKED"),
        shipped: c("SHIPPED") + c("OUT_FOR_DELIVERY"),
        delivered: c("DELIVERED"),
        cancelled: c("CANCELLED"),
        refundPending: c("REFUND_PENDING") + c("RETURN_REQUESTED"),
      },
      inventoryHealth: {
        lowStockSkus: inventory.totals.lowStockSkus,
        outOfStockSkus: inventory.totals.outOfStockSkus,
        inventoryValue: inventory.totals.inventoryValue,
      },
      paymentHealth: {
        successRate: payments.successRate,
        failed24h,
        stuckRefunds,
      },
      customerHealth: {
        totalCustomers: customers,
        newCustomers,
        activeInRange: activeAgg[0]?.n || 0,
      },
      methodology: [
        "All money figures from Order.pricingSnapshot on paid non-cancelled orders (Asia/Kolkata day bounds).",
        "Profit/COGS not shown on executive KPIs until cost coverage is verified — open Finance for estimates.",
        "Comparison = previous period of equal length immediately before selected range.",
        "No fabricated metrics; empty ranges show 0 / Data unavailable.",
      ],
    };
  }
}
