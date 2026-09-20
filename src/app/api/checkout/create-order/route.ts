import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { CheckoutService } from "@/services/checkout.service";
import { createOrderSchema } from "@/validators/checkout";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }
    // Client may omit key on first attempt — server mints one and returns it for safe retries.
    // Disable the payment button while processing (client) to prevent double submits.
    const idempotencyKey = parsed.data.idempotencyKey || randomUUID();
    const out = await CheckoutService.createOrder({ userId: session.userId, ...parsed.data, idempotencyKey });
    return NextResponse.json(successResponse({ ...out, idempotencyKey }), { status: out.created ? 201 : 200 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create order error", "checkout", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to place order"), { status: 500 });
  }
}
