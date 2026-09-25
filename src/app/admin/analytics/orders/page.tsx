"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/MetricCard";
import { BarChart, DonutChart } from "@/components/admin/charts";
import { RangeBar, buildRangeQuery, formatInr, type RangeKey } from "@/components/admin/analytics-range";
import { ShoppingCart, Layers, TrendingUp, Activity } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "#8b5cf6",
  CONFIRMED: "#2563eb",
  PROCESSING: "#f59e0b",
  PACKED: "#06b6d4",
  SHIPPED: "#3b82f6",
  OUT_FOR_DELIVERY: "#6366f1",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
  REFUND_PENDING: "#f97316",
  REFUNDED: "#a855f7",
};

export default function OrdersAnalyticsPage() {
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
      const qs = buildRangeQuery(r, f, t);
      const res = await fetch(`/api/admin/analytics/orders?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load order analytics");
      setData(json.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("30d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRange = (r: RangeKey, f?: string, t?: string) => {
    setRange(r);
    if (f !== undefined) setFrom(f);
    if (t !== undefined) setTo(t);
    load(r, f ?? from, t ?? to);
  };

  const donut = (data?.byStatus || [])
    .filter((s: any) => s.count > 0)
    .map((s: any) => ({
      label: s.status,
      value: s.count,
      color: STATUS_COLORS[s.status] || "#64748b",
    }));

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            Order analytics
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            {data?.range?.label || range} · current status snapshot (not historical peak stage)
          </p>
        </div>
        <RangeBar range={range} from={from} to={to} onChange={onRange} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap text-xs">
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Hub</Link>
        <Link href="/admin/analytics/sales" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Sales</Link>
        <Link href="/admin/analytics/orders" className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold">Orders</Link>
        <Link href="/admin/analytics/customers" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Customers</Link>
        <Link href="/admin/analytics/inventory" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Inventory</Link>
        <Link href="/admin/finance" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Finance</Link>
      </div>

      {error && <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">{error}</div>}

      {loading ? (
        <div className="h-40 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <MetricCard title="Orders" value={String(data?.totals?.all ?? 0)} sub="All orders in range" icon={<ShoppingCart className="w-4 h-4" />} tone="blue" />
            <MetricCard title="Paid orders" value={String(data?.totals?.paid ?? 0)} sub="PAID and not cancelled" icon={<TrendingUp className="w-4 h-4" />} tone="green" />
            <MetricCard title="AOV" value={formatInr(data?.value?.aov)} sub={`Median ${formatInr(data?.value?.median)}`} icon={<Layers className="w-4 h-4" />} tone="purple" />
            <MetricCard title="Delivered" value={String(data?.totals?.delivered ?? 0)} sub={`Cancelled ${data?.totals?.cancelled ?? 0}`} icon={<Activity className="w-4 h-4" />} tone="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Status breakdown
              </h2>
              {donut.length ? <DonutChart slices={donut} /> : <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>}
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Current-stage funnel
              </h2>
              <p className="text-[11px] text-surface-500 mb-3">
                Counts by <em>current</em> status only — orders do not store historical peak stage, so drop-off is indicative.
              </p>
              <ul className="space-y-2">
                {(data?.funnel || []).map((f: any) => (
                  <li key={f.status} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-surface-700 dark:text-surface-300">{f.status}</span>
                    <span className="tabular-nums font-semibold">{f.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">Orders / day</h2>
              {data?.series?.length ? (
                <BarChart bars={data.series.map((s: any) => ({ label: s.date, value: s.orders }))} height={160} />
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Value histogram
              </h2>
              <ul className="space-y-2">
                {(data?.value?.histogram || []).map((h: any) => (
                  <li key={h.bucket} className="flex justify-between text-sm border-b border-surface-100 dark:border-surface-800 pb-1">
                    <span>{h.bucket}</span>
                    <span className="tabular-nums font-semibold">{h.count}</span>
                  </li>
                ))}
                {!data?.value?.histogram?.length && <li className="text-sm text-surface-500">Data unavailable</li>}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-surface-500">Min</p>
                  <p className="font-semibold tabular-nums">{formatInr(data?.value?.min)}</p>
                </div>
                <div>
                  <p className="text-surface-500">Max</p>
                  <p className="font-semibold tabular-nums">{formatInr(data?.value?.max)}</p>
                </div>
                <div>
                  <p className="text-surface-500">AOV</p>
                  <p className="font-semibold tabular-nums">{formatInr(data?.value?.aov)}</p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
