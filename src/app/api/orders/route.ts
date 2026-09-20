import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { OrderService } from "@/services/order.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const sp = new URL(request.url).searchParams;
    const out = await OrderService.listForCustomer(
      session.userId,
      parseInt(sp.get("page") || "1"),
      Math.min(50, parseInt(sp.get("limit") || "10")),
      sp.get("status") || undefined
    );
    return NextResponse.json(paginatedResponse(out.items, out.page, out.limit, out.total));
  } catch (error: any) {
    logger.error("List orders error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list orders"), { status: 500 });
  }
}
