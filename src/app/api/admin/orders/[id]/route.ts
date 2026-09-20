import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { OrderService } from "@/services/order.service";
import { adminStatusSchema } from "@/validators/order";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "orders.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Orders permission required"), { status: 403 });
    }
    const { id } = await params;
    const out = await OrderService.adminGet(id);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin get order error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch order"), { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "orders.status.update" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Status update permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = adminStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input"), { status: 400 });
    }
    const out = await OrderService.adminTransition(id, parsed.data.to as any, session.userId, {
      notes: parsed.data.notes,
      trackingNumber: parsed.data.trackingNumber,
      courier: parsed.data.courier,
    });
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin transition error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Status update failed"), { status: 500 });
  }
}
