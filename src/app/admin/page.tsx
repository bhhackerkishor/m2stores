"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/admin/MetricCard";
import { LineChart, BarChart, DonutChart } from "@/components/admin/charts";
import { Card } from "@/components/ui/card";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton";
import {
  IndianRupee,
  ShoppingCart,
  Users,
  AlertTriangle,
  TrendingUp,
  Package,
  CreditCard,
  ArrowRight,
  RefreshCcw,
} from "lucide-react";

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "90d" | "this_month" | "prev_month" | "this_year" | "custom";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "this_month", label: "Month" },
  { key: "prev_month", label: "Prev" },
  { key: "this_year", label: "Year" },
];

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-950/40 dark:text-danger-400 dark:border-danger-900",
  warning: "bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950/40 dark:text-warning-400 dark:border-warning-900",
  info: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/40 dark:text-brand-400 dark:border-brand-900",
};

export default function AdminDashboardPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (r: RangeKey = range, f = from, t = to) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range: r });
      if (r === "custom" && f) params.set("from", f);
      if (r === "custom" && t) params.set("to", t);
      const res = await fetch(`/api/admin/analytics/executive?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to load dashboard");
        return;
      }
      setData(json.data);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("30d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis: any[] = data?.kpis || [];
  const rev = data?.revenue;
  const series = rev?.series || [];
  const actions: any[] = data?.actionCenter || [];
  const oh = data?.orderHealth || {};
  const inv = data?.inventoryHealth || {};
  const pay = data?.paymentHealth || {};
  const cust = data?.customerHealth || {};

  const kpiIcon = (id: string) => {
    switch (id) {
      case "revenue":
      case "net_sales":
        return <IndianRupee className="w-4 h-4" />;
      case "paid_orders":
        return <ShoppingCart className="w-4 h-4" />;
      case "customers_new":
        return <Users className="w-4 h-4" />;
      case "low_stock_skus":
        return <Package className="w-4 h-4" />;
      case "refunds":
        return <RefreshCcw className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const kpiTone = (id: string): "blue" | "green" | "amber" | "red" | "purple" => {
    if (id === "revenue" || id === "net_sales") return "green";
    if (id === "paid_orders") return "blue";
    if (id === "refunds") return "amber";
    if (id === "low_stock_skus") return "red";
    if (id === "customers_new") return "purple";
    return "blue";
  };

  const changeLabel = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined) return "vs prev period — n/a";
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct}% vs prev period`;
  };

  const donutData = [
    { name: "Delivered", value: oh.delivered || 0, color: "#10b981" },
    { name: "Shipped", value: oh.shipped || 0, color: "#2563eb" },
    { name: "Processing", value: (oh.processing || 0) + (oh.packed || 0), color: "#f59e0b" },
    { name: "Pending", value: oh.pendingPayment || 0, color: "#8b5cf6" },
    { name: "Cancelled", value: oh.cancelled || 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            Dashboard
          </h1>
          {data?.range?.label && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
              {data.range.label} · comparison: previous period · TZ Asia/Kolkata
            </p>
          )}
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRange(r.key);
                load(r.key);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                range === r.key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
              }`}
            >
              {r.label}
            </button>
          ))}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-700 dark:text-surface-300"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-700 dark:text-surface-300"
          />
          <button
            onClick={() => {
              setRange("custom");
              load("custom", from, to);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Custom
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
          {data?.methodology?.length > 0 && (
            <div className="mb-4 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
              <span className="font-semibold text-surface-700 dark:text-surface-300">Methodology: </span>
              {data.methodology.join(" ")}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {kpis.slice(0, 8).map((k) => (
              <div key={k.id} title={k.definition + (k.caveat ? ` Caveat: ${k.caveat}` : "")}>
                <MetricCard
                  title={k.label}
                  value={k.display}
                  sub={changeLabel(k.changePct)}
                  icon={kpiIcon(k.id)}
                  tone={kpiTone(k.id)}
                />
              </div>
            ))}
            {kpis.length === 0 && (
              <div className="col-span-full p-4 text-sm text-surface-500">Data unavailable</div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <Card className="xl:col-span-2 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                  Revenue trend
                </h2>
                <Link
                  href="/admin/analytics/sales"
                  className="text-xs text-brand-600 dark:text-brand-400 font-medium inline-flex items-center gap-1"
                >
                  Sales analytics <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {series.length > 0 ? (
                <LineChart
                  points={series.map((s: any) => ({ x: s.date, y: s.revenue }))}
                  height={220}
                />
              ) : (
                <p className="text-sm text-surface-500 py-10 text-center">Data unavailable</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-surface-500">Gross sales</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {rev?.grossSales != null ? `₹${rev.grossSales.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-surface-500">Net sales</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {rev?.netSales != null ? `₹${rev.netSales.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-surface-500">Discounts</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {rev?.discounts != null ? `₹${rev.discounts.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-surface-500">Refunds</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {rev?.refunds != null ? `₹${rev.refunds.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                  Action center
                </h2>
                <span className="text-[11px] text-surface-500">{actions.length} open</span>
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-surface-500 py-8 text-center">All clear — no urgent items</p>
              ) : (
                <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {actions.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={a.href}
                        className={`block rounded-lg border p-3 hover:shadow-sm transition-shadow ${PRIORITY_TONE[a.priority] || PRIORITY_TONE.info}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold flex items-center gap-1.5">
                              {a.priority === "critical" && <AlertTriangle className="w-3.5 h-3.5" />}
                              {a.title}
                              <span className="font-mono text-[10px] opacity-70">×{a.count}</span>
                            </p>
                            <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{a.description}</p>
                          </div>
                          <span className="text-[10px] font-semibold uppercase shrink-0">{a.actionLabel}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Order health
              </h2>
              {donutData.length > 0 ? (
                <DonutChart slices={donutData.map((d) => ({ label: d.name, value: d.value, color: d.color }))} />
              ) : (
                <p className="text-sm text-surface-500 py-6 text-center">Data unavailable</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Link href="/admin/orders" className="text-brand-600 dark:text-brand-400 font-medium">
                  Open orders →
                </Link>
                <Link href="/admin/analytics/orders" className="text-brand-600 dark:text-brand-400 font-medium">
                  Order funnel →
                </Link>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Inventory
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Low stock SKUs</span>
                  <span className="font-semibold tabular-nums text-warning-600">{inv.lowStockSkus ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Out of stock</span>
                  <span className="font-semibold tabular-nums text-danger-600">{inv.outOfStockSkus ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Value @ cost</span>
                  <span className="font-semibold tabular-nums">
                    {inv.inventoryValue != null ? `₹${inv.inventoryValue.toLocaleString("en-IN")}` : "Data unavailable"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-3 text-xs">
                <Link href="/admin/inventory" className="text-brand-600 dark:text-brand-400 font-medium">
                  Command center →
                </Link>
                <Link href="/admin/analytics/inventory" className="text-brand-600 dark:text-brand-400 font-medium">
                  Analytics →
                </Link>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Payments & customers
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Payment success</span>
                  <span className="font-semibold tabular-nums">
                    {pay.successRate != null ? `${pay.successRate}%` : "Data unavailable"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Failed (24h)</span>
                  <span className="font-semibold tabular-nums text-danger-600">{pay.failed24h ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Stuck refunds</span>
                  <span className="font-semibold tabular-nums text-warning-600">{pay.stuckRefunds ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Customers (all)</span>
                  <span className="font-semibold tabular-nums">{cust.totalCustomers ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">New in range</span>
                  <span className="font-semibold tabular-nums">{cust.newCustomers ?? 0}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-3 text-xs">
                <Link href="/admin/finance" className="text-brand-600 dark:text-brand-400 font-medium">
                  Finance →
                </Link>
                <Link href="/admin/customers" className="text-brand-600 dark:text-brand-400 font-medium">
                  Customers →
                </Link>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                  Daily orders
                </h2>
                <CreditCard className="w-4 h-4 text-surface-400" />
              </div>
              {series.length > 0 ? (
                <BarChart
                  bars={series.map((s: any) => ({ label: s.date, value: s.orders }))}
                  height={180}
                />
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                  Daily units sold
                </h2>
                <Package className="w-4 h-4 text-surface-400" />
              </div>
              {series.length > 0 ? (
                <BarChart
                  bars={series.map((s: any) => ({ label: s.date, value: s.units }))}
                  height={180}
                />
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
