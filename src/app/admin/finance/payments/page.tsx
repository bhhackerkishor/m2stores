"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/MetricCard";
import { RangeBar, buildRangeQuery, formatInr, type RangeKey } from "@/components/admin/analytics-range";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Smartphone, Banknote } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PAID: "text-accent-600",
  FAILED: "text-danger-600",
  PENDING: "text-warning-600",
  CREATED: "text-surface-500",
  REFUNDED: "text-purple-600",
  PARTIALLY_REFUNDED: "text-purple-500",
  CANCELLED: "text-surface-400",
  AUTHORIZED: "text-brand-600",
};

export default function FinancePaymentsPage() {
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
      const res = await fetch(`/api/admin/analytics/payments?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load payments");
      setData(json.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load payments");
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
  const exceptions: any[] = data?.exceptions || [];
  console.log(data?.exceptions)

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            Payments & reconciliation
          </h1>
          <p className="text-xs text-surface-500 mt-1">{data?.range?.label || range} · read-only from Payment + Order</p>
        </div>
        <RangeBar range={range} from={from} to={to} onChange={onRange} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap text-xs">
        <Link href="/admin/finance" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Overview</Link>
        <Link href="/admin/finance/payments" className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold">Payments</Link>
        <Link href="/admin/payments" className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-semibold">Ledger</Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <MetricCard
              title="Payment success rate"
              value={data?.successRate != null ? `${data.successRate}%` : "Data unavailable"}
              sub={`${t.paid || 0} paid · ${t.failed || 0} failed`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              tone="green"
            />
            <MetricCard
              title="Refunds"
              value={formatInr(data?.refunds?.amount)}
              sub={`${data?.refunds?.count || 0} completed · ${data?.refunds?.pending || 0} pending >48h`}
              icon={<AlertTriangle className="w-4 h-4" />}
              tone={data?.refunds?.pending > 0 ? "red" : "amber"}
            />
            <MetricCard
              title="COD orders"
              value={String(t.codOrders ?? 0)}
              sub={`PhonePe orders: ${t.phonepeOrders ?? 0}`}
              icon={<Banknote className="w-4 h-4" />}
              tone="blue"
            />
            <MetricCard
              title="Reconciliation exceptions"
              value={String(exceptions.length)}
              sub={exceptions.length ? "Review required" : "No mismatches detected"}
              icon={<XCircle className="w-4 h-4" />}
              tone={exceptions.length ? "red" : "green"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                By status
              </h2>
              {data?.byStatus?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase text-surface-500 border-b border-surface-100 dark:border-surface-800">
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Count</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStatus.map((s: any) => (
                      <tr key={s.status} className="border-b border-surface-50 dark:border-surface-800/50">
                        <td className={`py-2 font-semibold ${STATUS_COLORS[s.status] || ""}`}>{s.status}</td>
                        <td className="py-2 text-right tabular-nums">{s.count}</td>
                        <td className="py-2 text-right tabular-nums">{formatInr(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-surface-500 py-6 text-center">Data unavailable</p>
              )}
            </Card>

            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-3">
                By provider
              </h2>
              {data?.byProvider?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase text-surface-500 border-b border-surface-100 dark:border-surface-800">
                      <th className="py-2">Provider</th>
                      <th className="py-2 text-right">Count</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProvider.map((s: any) => (
                      <tr key={s.provider} className="border-b border-surface-50 dark:border-surface-800/50">
                        <td className="py-2 font-semibold inline-flex items-center gap-1.5">
                          {s.provider === "COD" ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                          {s.provider}
                        </td>
                        <td className="py-2 text-right tabular-nums">{s.count}</td>
                        <td className="py-2 text-right tabular-nums">{formatInr(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-surface-500 py-6 text-center">Data unavailable</p>
              )}
            </Card>
          </div>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                Exceptions
              </h2>
              <Clock className="w-4 h-4 text-surface-400" />
            </div>
            {exceptions.length === 0 ? (
              <p className="text-sm text-surface-500 py-6 text-center">No exceptions in range</p>
            ) : (
              <ul className="space-y-2">
                {exceptions.map((ex) => (
                  <li key={ex.id}>
                    <a
                      href={ex.href}
                      className="flex items-start justify-between gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                              ex.severity === "critical"
                                ? "bg-danger-50 text-danger-700"
                                : "bg-warning-50 text-warning-700"
                            }`}
                          >
                            {ex.severity}
                          </span>
                          {ex.title}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">{ex.description}</p>
                      </div>
                      <span className="text-[11px] text-brand-600 font-semibold shrink-0">Open</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
