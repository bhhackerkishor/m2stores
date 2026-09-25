/**
 * Single source of truth for analytics date ranges.
 * All analytics use Asia/Kolkata (IST) day boundaries — same policy as
 * DashboardService historically used. Reports must use resolveRange too
 * (never server-local setHours).
 */
import { z } from "zod";

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

export const RANGE_KEYS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "90d",
  "this_month",
  "prev_month",
  "this_year",
  "custom",
] as const;

export const rangeQuerySchema = z.object({
  range: z.enum(RANGE_KEYS).default("30d"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type RangeQuery = z.infer<typeof rangeQuerySchema>;

export const TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = 5.5 * 3600_000;

/** Start of IST calendar day containing `d`. */
export function istDayStart(d: Date): Date {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD key in IST. */
export function istDayKey(d: Date): string {
  return dayFmt.format(d);
}

export interface ResolvedRange {
  key: RangeKey;
  start: Date;
  end: Date;
  days: number;
  /** Inclusive start of previous comparable period (same length, ending day before start). */
  prevStart: Date;
  prevEnd: Date;
  label: string;
  timezone: string;
}

function parseDateOnly(s: string): Date {
  // "YYYY-MM-DD" → IST midnight
  return istDayStart(new Date(s));
}

export function resolveRange(range: RangeKey, from?: string, to?: string): ResolvedRange {
  const now = new Date();
  const todayStart = istDayStart(now);
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);

  let start: Date;
  let end: Date;
  let days: number;
  let label: string;

  switch (range) {
    case "today":
      start = todayStart;
      end = todayEnd;
      days = 1;
      label = "Today";
      break;
    case "yesterday": {
      start = new Date(todayStart.getTime() - 86400000);
      end = new Date(todayStart.getTime() - 1);
      days = 1;
      label = "Yesterday";
      break;
    }
    case "7d":
      start = new Date(todayStart.getTime() - 6 * 86400000);
      end = todayEnd;
      days = 7;
      label = "Last 7 days";
      break;
    case "90d":
      start = new Date(todayStart.getTime() - 89 * 86400000);
      end = todayEnd;
      days = 90;
      label = "Last 90 days";
      break;
    case "this_month": {
      const key = dayFmt.format(todayStart);
      const y = Number(key.slice(0, 4));
      const m = Number(key.slice(5, 7));
      start = istDayStart(new Date(Date.UTC(y, m - 1, 1)));
      end = todayEnd;
      days = Math.max(1, Math.round((todayStart.getTime() - start.getTime()) / 86400000) + 1);
      label = "This month";
      break;
    }
    case "prev_month": {
      const key = dayFmt.format(todayStart);
      const y = Number(key.slice(0, 4));
      const m = Number(key.slice(5, 7));
      start = istDayStart(new Date(Date.UTC(y, m - 2, 1)));
      const endDay = istDayStart(new Date(Date.UTC(y, m - 1, 1)));
      end = new Date(endDay.getTime() - 1);
      days = Math.max(1, Math.round((endDay.getTime() - start.getTime()) / 86400000));
      label = "Previous month";
      break;
    }
    case "this_year": {
      const y = Number(dayFmt.format(todayStart).slice(0, 4));
      start = istDayStart(new Date(Date.UTC(y, 0, 1)));
      end = todayEnd;
      days = Math.max(1, Math.round((todayStart.getTime() - start.getTime()) / 86400000) + 1);
      label = "This year";
      break;
    }
    case "custom": {
      start = from ? parseDateOnly(from) : todayStart;
      const endDay = to ? parseDateOnly(to) : todayStart;
      end = new Date(endDay.getTime() + 86400000 - 1);
      days = Math.max(1, Math.round((endDay.getTime() - start.getTime()) / 86400000) + 1);
      label = `${from || "…"} → ${to || "…"}`;
      break;
    }
    case "30d":
    default:
      start = new Date(todayStart.getTime() - 29 * 86400000);
      end = todayEnd;
      days = 30;
      label = "Last 30 days";
      break;
  }

  // Previous period: same length, immediately before start
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - days * 86400000);

  return {
    key: range,
    start,
    end,
    days,
    prevStart,
    prevEnd,
    label,
    timezone: TIMEZONE,
  };
}

/** Mongo match for createdAt within range. */
export function rangeMatch(r: Pick<ResolvedRange, "start" | "end">): Record<string, unknown> {
  return { createdAt: { $gte: r.start, $lte: r.end } };
}

export function prevRangeMatch(r: Pick<ResolvedRange, "prevStart" | "prevEnd">): Record<string, unknown> {
  return { createdAt: { $gte: r.prevStart, $lte: r.prevEnd } };
}

/**
 * Percentage change. Returns null when previous is 0/invalid (never show fake %).
 */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  if (!Number.isFinite(current)) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
