import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAnalytics, parseRangeParams } from "@/lib/analytics/auth";
import { ExecutiveDashboardService } from "@/services/analytics/executive.overview";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAnalytics("analytics.read");
    const { range, from, to } = parseRangeParams(new URL(request.url).searchParams);
    const data = await ExecutiveDashboardService.overview(range as any, from, to);
    return NextResponse.json(successResponse(data));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message, error.details), {
        status: error.statusCode,
      });
    }
    logger.error("Executive overview error", "analytics", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load executive overview"), {
      status: 500,
    });
  }
}
