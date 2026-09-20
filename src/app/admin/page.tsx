"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/admin/MetricCard";
import { LineChart, BarChart, DonutChart } from "@/components/admin/charts";
import { Card } from "@/components/ui/card";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { IndianRupee, ShoppingCart, Clock, CheckCircle2, XCircle, Users, AlertTriangle, RefreshCcw } from "lucide-react";

type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

const METHOD_COLORS: Record<string, string> = { PHONEPE: "#2563eb", COD: "#10b981", UNKNOWN: "#94a3b8" };
const STATUS_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b", "#06b6d4"];

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
      const res = await fetch(`/api/admin/dashboard/stats?${params.toString()}`, { cache: "no-store" });
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

  const k = data?.kpis || {};

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">Dashboard</h1>
        <div className="flex gap-1.5 items-center flex-wrap">
          {(["today", "7d", "30d", "90d"] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); load(r); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                range === r
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
              }`}
            >
              {r === "today" ? "Today" : r}
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
            onClick={() => { setRange("custom"); load("custom", from, to); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Custom
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm">{error}</div>
      )}

      {loading ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <MetricCard title="Revenue (period)" value={formatPrice(k.periodRevenue || 0)} sub={`${k.periodOrders || 0} paid orders`} icon={<IndianRupee className="w-5 h-5" />} tone="green" />
            <MetricCard title="Total Revenue" value={formatPrice(k.totalRevenue || 0)} sub={`${k.totalOrders || 0} paid orders all-time`} icon={<IndianRupee className="w-5 h-5" />} tone="blue" />
            <MetricCard title="Orders (period)" value={String(k.orders ?? 0)} sub={`${k.pending ?? 0} pending · ${k.delivered ?? 0} delivered`} icon={<ShoppingCart className="w-5 h-5" />} tone="purple" />
            <MetricCard title="Cancelled" value={String(k.cancelled ?? 0)} sub="in selected period" icon={<XCircle className="w-5 h-5" />} tone="red" />
            <MetricCard title="Customers" value={String(k.customersTotal ?? 0)} sub={`+${k.customersNew ?? 0} new in period`} icon={<Users className="w-5 h-5" />} tone="blue" />
            <MetricCard title="Low Stock SKUs" value={String(k.lowStock ?? 0)} sub="needs restock" icon={<AlertTriangle className="w-5 h-5" />} tone="amber" />
            <MetricCard title="Refunds" value={formatPrice(k.refundsAmount || 0)} sub={`${k.refundsCount ?? 0} refunds`} icon={<RefreshCcw className="w-5 h-5" />} tone="red" />
            <MetricCard title="Pending Fulfillment" value={String(k.pending ?? 0)} sub="action needed" icon={<Clock className="w-5 h-5" />} tone="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card>
              <h3 className="font-semibold mb-1 text-sm">Revenue Over Time</h3>
              <p className="text-[11px] text-surface-500 mb-3">Paid orders only · refunds excluded</p>
              <LineChart points={(data?.series || []).map((s: any) => ({ x: s.date, y: s.revenue }))} />
            </Card>
            <Card>
              <h3 className="font-semibold mb-1 text-sm">Orders Over Time</h3>
              <p className="text-[11px] text-surface-500 mb-3">Paid orders per day</p>
              <BarChart bars={(data?.series || []).map((s: any) => ({ label: s.date, value: s.orders }))} />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <Card>
              <h3 className="font-semibold mb-3 text-sm">Payment Methods</h3>
              <DonutChart slices={(data?.paymentMethods || []).map((m: any, i: number) => ({ label: m.method, value: m.count, color: METHOD_COLORS[m.method] || STATUS_COLORS[i % STATUS_COLORS.length] }))} />
            </Card>
            <Card>
              <h3 className="font-semibold mb-3 text-sm">Order Statuses</h3>
              <DonutChart slices={(data?.orderStatuses || []).map((s: any, i: number) => ({ label: s.status.replace(/_/g, " "), value: s.count, color: STATUS_COLORS[i % STATUS_COLORS.length] }))} />
            </Card>
            <Card>
              <h3 className="font-semibold mb-3 text-sm">Top Categories</h3>
              {(data?.categories || []).length === 0 ? (
                <p className="text-sm text-surface-500">No sales in this period yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(data?.categories || []).map((c: any) => (
                    <li key={c.name} className="flex justify-between"><span className="text-surface-600 dark:text-surface-400">{c.name}</span><span className="font-semibold">{formatPrice(c.revenue)}</span></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Top Products</h3>
              <Link href="/admin/products" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold">Manage catalog →</Link>
            </div>
            {(data?.topProducts || []).length === 0 ? (
              <p className="text-sm text-surface-500">No sales in this period yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-surface-500 border-b border-surface-200 dark:border-surface-800">
                      <th className="py-2.5 px-6">Product</th>
                      <th className="py-2.5 text-right px-6">Qty</th>
                      <th className="py-2.5 text-right px-6">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {(data?.topProducts || []).map((p: any) => (
                      <tr key={p.productId} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="py-2.5 px-6 font-medium">{p.name}</td>
                        <td className="py-2.5 text-right px-6 tabular-nums">{p.qty}</td>
                        <td className="py-2.5 text-right px-6 font-semibold">{formatPrice(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex gap-4 text-sm">
              <Link href="/admin/orders" className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Fulfill orders
              </Link>
              <Link href="/admin/inventory" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">Restock low inventory →</Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
