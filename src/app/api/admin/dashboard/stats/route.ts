import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { DashboardService, RangeKey } from "@/services/dashboard.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const schema = z.object({
  range: z.enum(["today", "7d", "30d", "90d", "custom"]).default("30d"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "analytics.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Analytics permission required"), { status: 403 });
    }
    const sp = new URL(request.url).searchParams;
    const parsed = schema.safeParse({ range: sp.get("range") || "30d", from: sp.get("from") || undefined, to: sp.get("to") || undefined });
    if (!parsed.success) return NextResponse.json(errorResponse("VALIDATION_ERROR", "Invalid range"), { status: 400 });
    const out = await DashboardService.stats(parsed.data.range as RangeKey, parsed.data.from, parsed.data.to);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Dashboard stats error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load dashboard"), { status: 500 });
  }
}
