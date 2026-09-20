import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { ReviewService } from "@/services/review.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "reviews.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Reviews permission required"), { status: 403 });
    }
    const sp = new URL(request.url).searchParams;
    const out = await ReviewService.adminList(sp.get("status") || undefined, parseInt(sp.get("page") || "1"), 20);
    return NextResponse.json(paginatedResponse(out.items, out.page, out.limit, out.total));
  } catch (error: any) {
    logger.error("Admin reviews error", "review", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
