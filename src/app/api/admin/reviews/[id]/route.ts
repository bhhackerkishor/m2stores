import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { ReviewService } from "@/services/review.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const schema = z.object({ action: z.enum(["approve", "hide", "delete"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "reviews.moderate" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Moderation permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json(errorResponse("VALIDATION_ERROR", "Invalid action"), { status: 400 });
    const out = await ReviewService.moderate(id, parsed.data.action, session.userId);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Moderate review error", "review", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Moderation failed"), { status: 500 });
  }
}
