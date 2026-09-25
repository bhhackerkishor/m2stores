import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAnalytics, parseRangeParams } from "@/lib/analytics/auth";
import { InventoryAnalyticsService } from "@/services/analytics/inventory.analytics";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAnalytics("inventory.read");
    const { range, from, to } = parseRangeParams(new URL(request.url).searchParams);
    const data = await InventoryAnalyticsService.overview(range as any, from, to);
    return NextResponse.json(successResponse(data));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message, error.details), {
        status: error.statusCode,
      });
    }
    logger.error("Inventory analytics error", "analytics", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load inventory analytics"), {
      status: 500,
    });
  }
}
