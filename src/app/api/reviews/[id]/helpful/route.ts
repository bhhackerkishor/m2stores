import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { ReviewService } from "@/services/review.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const { id } = await params;
    const out = await ReviewService.voteHelpful(id, session.userId);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Helpful vote error", "review", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Vote failed"), { status: 500 });
  }
}
