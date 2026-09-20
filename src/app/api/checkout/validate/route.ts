import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { CheckoutService } from "@/services/checkout.service";
import { validateCheckoutSchema } from "@/validators/checkout";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const body = await request.json();
    const parsed = validateCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }
    const out = await CheckoutService.validate({ userId: session.userId, ...parsed.data });
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Checkout validate error", "checkout", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Validation failed"), { status: 500 });
  }
}
