import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { OrderService } from "@/services/order.service";
import { cancelOrderSchema } from "@/validators/order";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = cancelOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Reason required"), { status: 400 });
    }
    const out = await OrderService.cancelOrder(id, session.userId, parsed.data.reason, session.role);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Cancel order error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Cancellation failed"), { status: 500 });
  }
}
