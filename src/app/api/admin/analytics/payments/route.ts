import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAnalytics, parseRangeParams } from "@/lib/analytics/auth";
import { PaymentAnalyticsService } from "@/services/analytics/payment.analytics";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAnalytics("payments.read");
    const { range, from, to } = parseRangeParams(new URL(request.url).searchParams);
    const data = await PaymentAnalyticsService.overview(range as any, from, to);
    return NextResponse.json(successResponse(data));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message, error.details), {
        status: error.statusCode,
      });
    }
    logger.error("Payment analytics error", "analytics", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load payment analytics"), {
      status: 500,
    });
  }
}
