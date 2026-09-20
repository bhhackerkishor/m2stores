import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { OrderService } from "@/services/order.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

function requireOrdersRead(role: string) {
  if (!hasPermission(role, "orders.read" as any)) throw new AppError("Orders permission required", 403, "FORBIDDEN");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    requireOrdersRead(session.role);
    const sp = new URL(request.url).searchParams;
    const out = await OrderService.adminList({
      page: parseInt(sp.get("page") || "1"),
      limit: parseInt(sp.get("limit") || "20"),
      status: sp.get("status") || undefined,
      q: sp.get("q") || undefined,
    });
    return NextResponse.json(paginatedResponse(out.items, out.page, out.limit, out.total));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin list orders error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list orders"), { status: 500 });
  }
}
