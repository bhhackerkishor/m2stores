import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { CouponService } from "@/services/coupon.service";
import { createCouponSchema } from "@/validators/marketing";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

function guard(role: string) {
  if (!hasPermission(role, "coupons.read" as any)) throw new AppError("Coupons permission required", 403, "FORBIDDEN");
}

export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    guard(session.role);
    return NextResponse.json(successResponse(await CouponService.list()));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("List coupons error", "coupon", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list coupons"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "coupons.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Coupons write permission required"), { status: 403 });
    }
    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid coupon", parsed.error.flatten()), { status: 400 });
    }
    const created = await CouponService.create(parsed.data, session.userId);
    return NextResponse.json(successResponse(created), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create coupon error", "coupon", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create coupon"), { status: 500 });
  }
}
