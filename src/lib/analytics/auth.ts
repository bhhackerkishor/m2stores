/**
 * Server-side analytics authorization. Every analytics API MUST call this.
 * Never trust client roles or query params.
 */
import { requirePermission } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";

export type AnalyticsPermission = "analytics.read" | "reports.export" | "payments.read" | "inventory.read";

export type AnalyticsSession = Awaited<ReturnType<typeof requirePermission>>;

export async function requireAnalytics(permission: AnalyticsPermission = "analytics.read") {
  try {
    return (await requirePermission(permission)) as AnalyticsSession;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("Analytics permission required", 403, "FORBIDDEN");
  }
}

/** Parse range query params safely. */
export function parseRangeParams(sp: URLSearchParams) {
  const range = sp.get("range") || "30d";
  const valid = ["today", "yesterday", "7d", "30d", "90d", "this_month", "prev_month", "this_year", "custom"];
  if (!valid.includes(range)) {
    throw new AppError("Invalid range", 400, "VALIDATION_ERROR", { range, allowed: valid });
  }
  return {
    range: range as (typeof valid)[number],
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  };
}
