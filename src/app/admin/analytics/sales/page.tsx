"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/MetricCard";
import { LineChart, BarChart, DonutChart } from "@/components/admin/charts";
import { RangeBar, buildRangeQuery, formatInr, type RangeKey } from "@/components/admin/analytics-range";
import { IndianRupee, ShoppingCart, Package, Percent } from "lucide-react";

export default function SalesAnalyticsPage() {
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
      const res = await fetch(`/api/admin/analytics/revenue?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load sales analytics");
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

  const breakdown = [
    { label: "Tax", value: data?.taxCollected || 0, color: "#8b5cf6" },
    { label: "Shipping", value: data?.shippingCharged || 0, color: "#2563eb" },
    { label: "COD fees", value: data?.codFees || 0, color: "#f59e0b" },
    { label: "Discounts", value: data?.discounts || 0, color: "#ef4444" },
  ].filter((x) => x.value > 0);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            Sales analytics
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            {data?.range?.label || range} · paid non-cancelled orders · Asia/Kolkata
          </p>
        </div>
        <RangeBar range={range} from={from} to={to} onChange={onRange} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap text-xs">
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Hub</Link>
        <Link href="/admin/analytics/sales" className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold">Sales</Link>
        <Link href="/admin/analytics/orders" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Orders</Link>
        <Link href="/admin/analytics/customers" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Customers</Link>
        <Link href="/admin/analytics/inventory" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Inventory</Link>
        <Link href="/admin/finance" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Finance</Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="h-40 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <MetricCard title="Gross sales" value={formatInr(data?.grossSales)} sub="Line total before order discounts" icon={<IndianRupee className="w-4 h-4" />} tone="green" />
            <MetricCard title="Net sales" value={formatInr(data?.netSales)} sub={`Discounts ${formatInr(data?.discounts)}`} icon={<Percent className="w-4 h-4" />} tone="blue" />
            <MetricCard title="Revenue" value={formatInr(data?.revenue)} sub={`AOV ${formatInr(data?.aov)}`} icon={<ShoppingCart className="w-4 h-4" />} tone="purple" />
            <MetricCard title="Units sold" value={String(data?.unitsSold ?? 0)} sub={`${data?.paidOrders ?? 0} paid / ${data?.allOrders ?? 0} total orders`} icon={<Package className="w-4 h-4" />} tone="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <Card className="xl:col-span-2 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">Revenue trend</h2>
              {data?.series?.length ? (
                <LineChart points={data.series.map((s: any) => ({ x: s.date, y: s.revenue }))} height={220} />
              ) : (
                <p className="text-sm text-surface-500 py-10 text-center">Data unavailable</p>
              )}
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">Components</h2>
              {breakdown.length ? (
                <DonutChart slices={breakdown} />
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
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
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">Units / day</h2>
              {data?.series?.length ? (
                <BarChart bars={data.series.map((s: any) => ({ label: s.date, value: s.units }))} height={160} />
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
            </Card>
          </div>

          <p className="mt-4 text-[11px] text-surface-500">
            vs previous period — revenue {data?.changes?.revenuePct != null ? `${data.changes.revenuePct}%` : "n/a"} ·
            orders {data?.changes?.paidOrdersPct != null ? `${data.changes.paidOrdersPct}%` : "n/a"} ·
            AOV {data?.changes?.aovPct != null ? `${data.changes.aovPct}%` : "n/a"}
          </p>
        </>
      )}
    </div>
  );
}
