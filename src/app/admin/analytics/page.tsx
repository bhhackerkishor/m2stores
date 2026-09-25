"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BarChart3, ShoppingCart, Users, Package, Receipt, CreditCard, TrendingUp, Percent, AlertTriangle } from "lucide-react";

const MODULES = [
  {
    href: "/admin/analytics/sales",
    title: "Sales",
    description: "Gross/net revenue, AOV, units, discounts, tax & shipping components, day series.",
    icon: TrendingUp,
    color: "text-accent-600 bg-accent-50 dark:bg-accent-950/30",
  },
  {
    href: "/admin/analytics/orders",
    title: "Orders",
    description: "Status counts, current-stage funnel, value distribution, paid vs all.",
    icon: ShoppingCart,
    color: "text-brand-600 bg-brand-50 dark:bg-brand-950/30",
  },
  {
    href: "/admin/analytics/customers",
    title: "Customers",
    description: "New vs returning, segments by spend, top customers, repeat rate.",
    icon: Users,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  },
  {
    href: "/admin/analytics/inventory",
    title: "Inventory",
    description: "Stock health, reorder queue, dead stock, movements, value at cost.",
    icon: Package,
    color: "text-warning-600 bg-warning-50 dark:bg-warning-950/30",
  },
  {
    href: "/admin/finance",
    title: "Finance overview",
    description: "Revenue reconciliation, estimated profit/margin with explicit methodology.",
    icon: Receipt,
    color: "text-accent-600 bg-accent-50 dark:bg-accent-950/30",
  },
  {
    href: "/admin/finance/payments",
    title: "Payments",
    description: "Success rates, provider mix, refunds, reconciliation exceptions.",
    icon: CreditCard,
    color: "text-danger-600 bg-danger-50 dark:bg-danger-950/30",
  },
  {
    href: "/admin/reports",
    title: "Reports export",
    description: "CSV exports with permission-gated downloads.",
    icon: BarChart3,
    color: "text-brand-600 bg-brand-50 dark:bg-brand-950/30",
  },
];

export default function AnalyticsHubPage() {
  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">Analytics</h1>
          <p className="text-xs text-surface-500 mt-1">
            Server-side aggregations · RBAC <code className="text-[11px]">analytics.read</code> · Asia/Kolkata · no fabricated metrics
          </p>
        </div>
        <Link
          href="/admin"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white"
        >
          Executive dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href}>
              <Card hover className="p-5 h-full">
                <div className="flex items-start gap-3">
                  <span className={`p-2.5 rounded-xl ${m.color}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-surface-900 dark:text-surface-100">{m.title}</h2>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" />
          <div className="text-xs text-surface-600 dark:text-surface-400 space-y-1.5">
            <p className="font-semibold text-surface-800 dark:text-surface-200 uppercase tracking-wider text-[11px]">
              Shared rules
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Every KPI uses the metric registry — same name = same formula everywhere.</li>
              <li>Money from <code>Order.pricingSnapshot</code> on paid non-cancelled orders unless noted.</li>
              <li>Profit/COGS estimated from current product cost — labeled approximate; missing costs show Data unavailable.</li>
              <li>Gateway fees, packaging, and carrier cost are not stored — contribution margin not claimed.</li>
              <li>Comparison windows equal the selected range length, ending the day before.</li>
            </ul>
            <p className="flex items-center gap-1 pt-1">
              <Percent className="w-3 h-3" /> Executive KPIs → <Link className="text-brand-600 font-semibold" href="/admin">/admin</Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
