import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "purple";
}

const tones: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-brand-50 dark:bg-brand-950/30", text: "text-brand-600 dark:text-brand-400" },
  green: { bg: "bg-accent-50 dark:bg-accent-950/30", text: "text-accent-600 dark:text-accent-400" },
  amber: { bg: "bg-warning-50 dark:bg-warning-950/30", text: "text-warning-600 dark:text-warning-400" },
  red: { bg: "bg-danger-50 dark:bg-danger-950/30", text: "text-danger-600 dark:text-danger-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-600 dark:text-purple-400" },
};

export function MetricCard({ title, value, sub, icon, tone = "blue" }: MetricCardProps) {
  const t = tones[tone];
  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-card p-4 sm:p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">{title}</p>
        {icon && <span className={cn("p-2 rounded-lg", t.bg, t.text)}>{icon}</span>}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}
