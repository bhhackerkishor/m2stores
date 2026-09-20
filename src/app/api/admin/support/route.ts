import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { SupportService } from "@/services/support.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "support.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Support permission required"), { status: 403 });
    }
    const sp = new URL(request.url).searchParams;
    const out = await SupportService.adminList(sp.get("status") || undefined, sp.get("priority") || undefined, parseInt(sp.get("page") || "1"), 20);
    return NextResponse.json(paginatedResponse(out.items, out.page, out.limit, out.total));
  } catch (error: any) {
    logger.error("Admin tickets error", "support", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
