import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { ReviewService } from "@/services/review.service";
import { createReviewSchema } from "@/validators/engagement";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const productId = sp.get("productId");
    if (!productId) return NextResponse.json(errorResponse("VALIDATION_ERROR", "productId is required"), { status: 400 });
    const out = await ReviewService.listApproved(productId, parseInt(sp.get("page") || "1"), Math.min(20, parseInt(sp.get("limit") || "10")));
    return NextResponse.json({
      success: true,
      data: out.items,
      histogram: out.histogram,
      pagination: { page: out.page, limit: out.limit, total: out.total, totalPages: out.totalPages },
    });
  } catch (error: any) {
    logger.error("List reviews error", "review", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list reviews"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid review"), { status: 400 });
    }
    const created = await ReviewService.submit(session.userId, parsed.data);
    return NextResponse.json(successResponse(created), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Submit review error", "review", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to submit review"), { status: 500 });
  }
}
