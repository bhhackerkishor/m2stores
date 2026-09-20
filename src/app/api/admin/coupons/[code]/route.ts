import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { CouponService } from "@/services/coupon.service";
import { updateCouponSchema } from "@/validators/marketing";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "coupons.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Coupons write permission required"), { status: 403 });
    }
    const { code } = await params;
    const body = await request.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid coupon"), { status: 400 });
    }
    return NextResponse.json(successResponse(await CouponService.update(decodeURIComponent(code), parsed.data, session.userId)));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Update coupon error", "coupon", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update coupon"), { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "coupons.delete" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Coupons delete permission required"), { status: 403 });
    }
    const { code } = await params;
    return NextResponse.json(successResponse(await CouponService.remove(decodeURIComponent(code), session.userId)));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Delete coupon error", "coupon", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to delete coupon"), { status: 500 });
  }
}
