import { notificationPatchSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/auth-server";
import { NotificationService } from "@/services/notification/notification.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";


const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unread: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsedQuery = listQuerySchema.safeParse(raw);
    if (!parsedQuery.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Invalid query parameters"), { status: 400 });
    }
    const q = parsedQuery.data;
    const out = await NotificationService.listForUser(
      session.userId,
      q.page ?? 1,
      q.limit ?? 20,
      q.unread === "true"
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
    const body = await request.json().catch(() => null);
    const parsed = notificationPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "id is required"), { status: 400 });
    }
    const data = parsed.data;
    if (data.all) {
      return NextResponse.json(successResponse(await NotificationService.markAllRead(session.userId)));
    }
    if (!data.id) return NextResponse.json(errorResponse("VALIDATION_ERROR", "id is required"), { status: 400 });
    return NextResponse.json(successResponse(await NotificationService.markRead(session.userId, data.id)));
  } catch (error: any) {
    logger.error("Mark notification error", "notification", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
