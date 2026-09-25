"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/MetricCard";
import { LineChart, BarChart } from "@/components/admin/charts";
import { RangeBar, buildRangeQuery, formatInr, type RangeKey } from "@/components/admin/analytics-range";
import { Users, UserPlus, Repeat2, Crown } from "lucide-react";

export default function CustomersAnalyticsPage() {
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
      const res = await fetch(`/api/admin/analytics/customers?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load customer analytics");
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

  const t = data?.totals || {};

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            Customer analytics
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            {data?.range?.label || range} · User + Order only · no third-party CDP
          </p>
        </div>
        <RangeBar range={range} from={from} to={to} onChange={onRange} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap text-xs">
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Hub</Link>
        <Link href="/admin/analytics/sales" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Sales</Link>
        <Link href="/admin/analytics/orders" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Orders</Link>
        <Link href="/admin/analytics/customers" className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold">Customers</Link>
        <Link href="/admin/analytics/inventory" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Inventory</Link>
        <Link href="/admin/finance" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Finance</Link>
      </div>

      {error && <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">{error}</div>}

      {loading ? (
        <div className="h-40 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <MetricCard title="Customers (all)" value={String(t.customersAllTime ?? 0)} sub={`Active in range: ${t.activeInRange ?? 0}`} icon={<Users className="w-4 h-4" />} tone="blue" />
            <MetricCard title="New customers" value={String(t.newCustomers ?? 0)} sub={`Prev period: ${t.previousNewCustomers ?? 0}`} icon={<UserPlus className="w-4 h-4" />} tone="green" />
            <MetricCard title="Repeat rate" value={t.repeatRatePct != null ? `${t.repeatRatePct}%` : "Data unavailable"} sub={`${t.repeatCustomers ?? 0} of ${t.customersWithOrders ?? 0} with orders`} icon={<Repeat2 className="w-4 h-4" />} tone="purple" />
            <MetricCard title="Orders / customer" value={data?.ordersPerCustomer?.avg != null ? String(data.ordersPerCustomer.avg) : "Data unavailable"} sub={`Max ${data?.ordersPerCustomer?.max ?? "—"}`} icon={<Crown className="w-4 h-4" />} tone="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">New vs active</h2>
              {data?.series?.length ? (
                <LineChart points={data.series.map((s: any) => ({ x: s.date, y: s.newCustomers }))} height={200} />
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                New vs returning revenue
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-surface-50 dark:bg-surface-800 p-3">
                  <p className="text-[11px] uppercase text-surface-500">New</p>
                  <p className="text-lg font-bold tabular-nums">{formatInr(data?.newVsReturning?.newRevenue)}</p>
                  <p className="text-xs text-surface-500">{data?.newVsReturning?.newCustomers ?? 0} cust · {data?.newVsReturning?.newOrders ?? 0} orders</p>
                </div>
                <div className="rounded-lg bg-surface-50 dark:bg-surface-800 p-3">
                  <p className="text-[11px] uppercase text-surface-500">Returning</p>
                  <p className="text-lg font-bold tabular-nums">{formatInr(data?.newVsReturning?.returningRevenue)}</p>
                  <p className="text-xs text-surface-500">{data?.newVsReturning?.returningCustomers ?? 0} cust · {data?.newVsReturning?.returningOrders ?? 0} orders</p>
                </div>
              </div>
              <h3 className="text-xs font-semibold uppercase text-surface-500 mb-2">Spend segments</h3>
              <BarChart
                bars={(data?.segments || []).map((s: any) => ({ label: s.segment, value: s.customers }))}
                height={100}
              />
            </Card>
          </div>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                Top customers (by revenue in range)
              </h2>
              <Link href="/admin/customers" className="text-xs text-brand-600 font-medium">All customers →</Link>
            </div>
            {data?.topCustomers?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase text-surface-500 border-b border-surface-200 dark:border-surface-800">
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Segment</th>
                      <th className="py-2 pr-3 text-right">Orders</th>
                      <th className="py-2 pr-3 text-right">Spent</th>
                      <th className="py-2 text-right">Last order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c: any) => (
                      <tr key={c.userId} className="border-b border-surface-50 dark:border-surface-800/50">
                        <td className="py-2 pr-3">
                          <a href={`/admin/customers/${c.userId}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                            {c.name || c.email || c.userId}
                          </a>
                          <div className="text-[11px] text-surface-500">{c.email}</div>
                        </td>
                        <td className="py-2 pr-3">{c.segment}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{c.orders}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-semibold">{formatInr(c.spent)}</td>
                        <td className="py-2 text-right text-xs text-surface-500">
                          {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-surface-500 py-6 text-center">Data unavailable</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
