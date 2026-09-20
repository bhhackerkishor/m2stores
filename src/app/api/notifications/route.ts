import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { NotificationService } from "@/services/notification/notification.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const sp = new URL(request.url).searchParams;
    const out = await NotificationService.listForUser(
      session.userId,
      parseInt(sp.get("page") || "1"),
      Math.min(50, parseInt(sp.get("limit") || "20")),
      sp.get("unread") === "true"
    );
    return NextResponse.json(paginatedResponse(out.items, out.page, out.limit, out.total));
  } catch (error: any) {
    logger.error("List notifications error", "notification", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const body = await request.json().catch(() => ({}));
    if (body.all) {
      return NextResponse.json(successResponse(await NotificationService.markAllRead(session.userId)));
    }
    if (!body.id) return NextResponse.json(errorResponse("VALIDATION_ERROR", "id is required"), { status: 400 });
    return NextResponse.json(successResponse(await NotificationService.markRead(session.userId, body.id)));
  } catch (error: any) {
    logger.error("Mark notification error", "notification", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
