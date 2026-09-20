import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { OrderService } from "@/services/order.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const { id } = await params;
    const order = await OrderService.getForCustomer(id, session.userId);
    return NextResponse.json(successResponse(order));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Get order error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch order"), { status: 500 });
  }
}
