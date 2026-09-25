"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/MetricCard";
import { LineChart, BarChart } from "@/components/admin/charts";
import { RangeBar, buildRangeQuery, formatInr, formatPct, type RangeKey } from "@/components/admin/analytics-range";
import { IndianRupee, Percent, Receipt, AlertTriangle, RefreshCcw } from "lucide-react";

export default function FinanceOverviewPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revenue, setRevenue] = useState<any>(null);
  const [profit, setProfit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (r: RangeKey = range, f = from, t = to) => {
    setLoading(true);
    setError("");
    try {
      const qs = buildRangeQuery(r, f, t);
      const [revRes, profRes] = await Promise.all([
        fetch(`/api/admin/analytics/revenue?${qs}`, { cache: "no-store" }),
        fetch(`/api/admin/analytics/profit?${qs}`, { cache: "no-store" }),
      ]);
      const revJson = await revRes.json();
      const profJson = await profRes.json();
      if (!revJson.success) throw new Error(revJson.error?.message || "Failed to load revenue");
      if (!profJson.success) throw new Error(profJson.error?.message || "Failed to load profit");
      setRevenue(revJson.data);
      setProfit(profJson.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load finance data");
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

  const dq = profit?.dataQuality;

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">Finance</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            {revenue?.range?.label || range} · IST · single-source metrics · profit is estimated where noted
          </p>
        </div>
        <RangeBar range={range} from={from} to={to} onChange={onRange} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap text-xs">
        <Link href="/admin/finance" className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold">Overview</Link>
        <Link href="/admin/finance/payments" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Payments</Link>
        <Link href="/admin/analytics/sales" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Sales detail</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <MetricCard
              title="Revenue (settled)"
              value={formatInr(revenue?.revenue)}
              sub={`AOV ${formatInr(revenue?.aov)} · ${revenue?.paidOrders ?? 0} paid orders`}
              icon={<IndianRupee className="w-4 h-4" />}
              tone="green"
            />
            <MetricCard
              title="Net sales"
              value={formatInr(revenue?.netSales)}
              sub={`Gross ${formatInr(revenue?.grossSales)} · discounts ${formatInr(revenue?.discounts)}`}
              icon={<Receipt className="w-4 h-4" />}
              tone="blue"
            />
            <MetricCard
              title="Est. gross profit"
              value={profit?.grossProfit != null ? formatInr(profit.grossProfit) : "Data unavailable"}
              sub={`Margin ${profit?.grossMarginPct != null ? `${profit.grossMarginPct}%` : "—"} · COGS ${formatInr(profit?.cogs)}`}
              icon={<Percent className="w-4 h-4" />}
              tone={profit?.grossProfit != null ? "purple" : "amber"}
            />
            <MetricCard
              title="Refunds"
              value={formatInr(revenue?.refunds)}
              sub={`Tax ${formatInr(revenue?.taxCollected)} · shipping ${formatInr(revenue?.shippingCharged)}`}
              icon={<RefreshCcw className="w-4 h-4" />}
              tone="amber"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <Card className="xl:col-span-2 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Revenue by day
              </h2>
              {revenue?.series?.length ? (
                <LineChart points={revenue.series.map((s: any) => ({ x: s.date, y: s.revenue }))} height={220} />
              ) : (
                <p className="text-sm text-surface-500 py-10 text-center">Data unavailable</p>
              )}
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                Top profit products
              </h2>
              {profit?.topProfitProducts?.length ? (
                <ul className="space-y-2 max-h-[240px] overflow-y-auto">
                  {profit.topProfitProducts.map((p: any) => (
                    <li key={p.productId} className="flex justify-between gap-2 text-sm border-b border-surface-100 dark:border-surface-800 pb-1.5">
                      <span className="truncate">{p.name}</span>
                      <span className={`tabular-nums font-semibold shrink-0 ${(p.grossProfit ?? 0) >= 0 ? "text-accent-600" : "text-danger-600"}`}>
                        {p.grossProfit != null ? formatInr(p.grossProfit) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
              )}
            </Card>
          </div>

          <Card className="p-4 sm:p-5 mb-6">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                  Profit methodology & data quality
                </h2>
                <p className="text-xs text-surface-500 mt-1">
                  Coverage: <strong>{dq?.cogsCoverage || "unknown"}</strong> · products sold {dq?.productsSold ?? 0} · missing cost {dq?.productsMissingCost ?? 0}
                </p>
              </div>
            </div>
            <ul className="text-xs text-surface-600 dark:text-surface-400 space-y-1 list-disc pl-5">
              {(profit?.dataQuality?.notes || ["Data unavailable"]).map((n: string, i: number) => (
                <li key={i}>{n}</li>
              ))}
              <li>
                Payment gateway fees, merchant shipping cost, and packaging cost are not stored → contribution/net profit:{" "}
                <strong>Data unavailable</strong>.
              </li>
            </ul>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
              Daily units sold
            </h2>
            {revenue?.series?.length ? (
              <BarChart bars={revenue.series.map((s: any) => ({ label: s.date, value: s.units }))} height={160} />
            ) : (
              <p className="text-sm text-surface-500 py-8 text-center">Data unavailable</p>
            )}
          </Card>

          <p className="mt-4 text-[11px] text-surface-500">
            Previous period: {formatPct(revenue?.changes?.revenuePct)} revenue · {formatPct(revenue?.changes?.paidOrdersPct)} orders ·{" "}
            {formatPct(revenue?.changes?.aovPct)} AOV
          </p>
        </>
      )}
    </div>
  );
}
