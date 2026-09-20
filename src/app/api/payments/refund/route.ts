import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { PaymentService } from "@/services/payment/payment.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const schema = z.object({
  orderNumber: z.string().min(1).max(64),
  amount: z.number().positive().max(1000000),
  reason: z.string().min(5).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "refunds.trigger" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Refunds permission required"), { status: 403 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input"), { status: 400 });
    }
    const out = await PaymentService.refund(parsed.data.orderNumber, parsed.data.amount, parsed.data.reason);
    try {
      const { AuditLog } = await import("@/models/AuditLog");
      await AuditLog.create({ admin: session.userId as any, action: "REFUND_CREATED", entity: "Payment", entityId: parsed.data.orderNumber, newValue: { amount: parsed.data.amount } as any, timestamp: new Date() });
    } catch { /* best-effort */ }
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Refund error", "payment", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Refund failed"), { status: 500 });
  }
}
