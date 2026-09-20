import { NextRequest, NextResponse } from "next/server";
import { CartService, resolveIdentity } from "@/services/cart.service";
import { applyCouponSchema } from "@/validators/cart";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = applyCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Coupon code is required"), { status: 400 });
    }
    const identity = await resolveIdentity();
    const view = await CartService.applyCoupon(identity, parsed.data.code);
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Apply coupon error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to apply coupon"), { status: 500 });
  }
}

export async function DELETE() {
  try {
    const identity = await resolveIdentity();
    const view = await CartService.removeCoupon(identity);
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    logger.error("Remove coupon error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to remove coupon"), { status: 500 });
  }
}
