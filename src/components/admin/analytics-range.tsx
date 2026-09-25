"use client";

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "prev_month"
  | "this_year"
  | "custom";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "this_month", label: "This month" },
  { key: "prev_month", label: "Prev month" },
  { key: "this_year", label: "Year" },
];

interface RangeBarProps {
  range: RangeKey;
  from?: string;
  to?: string;
  onChange: (range: RangeKey, from?: string, to?: string) => void;
  showCustom?: boolean;
}

export function RangeBar({ range, from = "", to = "", onChange, showCustom = true }: RangeBarProps) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            range === r.key
              ? "bg-brand-600 text-white shadow-sm"
              : "bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
          }`}
        >
          {r.label}
        </button>
      ))}
      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={(e) => onChange("custom", e.target.value, to)}
            className="px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-700 dark:text-surface-300"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => onChange("custom", from, e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-700 dark:text-surface-300"
          />
          <button
            type="button"
            onClick={() => onChange("custom", from, to)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export function buildRangeQuery(range: RangeKey, from?: string, to?: string): string {
  const params = new URLSearchParams({ range });
  if (range === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return params.toString();
}

export function formatInr(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "Data unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n}%`;
}

export function DeltaBadge({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined) {
    return <span className="text-[11px] text-surface-400">vs prev —</span>;
  }
  const up = pct >= 0;
  return (
    <span
      className={`text-[11px] font-semibold tabular-nums ${
        up ? "text-accent-600 dark:text-accent-400" : "text-danger-600 dark:text-danger-400"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}
