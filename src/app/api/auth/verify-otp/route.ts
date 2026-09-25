import { verifyOtpRequestSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyStoredOTP } from "@/lib/otp";
import { generateToken } from "@/lib/auth";
import { invalidateSession } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { checkRateLimit, clientIp, LIMITS } from "@/lib/rate-limit";


export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const ipLimit = await checkRateLimit("otp-verify-ip", ip, LIMITS.otpVerify.limit, LIMITS.otpVerify.windowMs);
    if (!ipLimit.allowed) {
      return NextResponse.json(errorResponse("RATE_LIMITED", "Too many verification attempts. Please try again later."), { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyOtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Identifier and a 6-digit OTP are required"), { status: 400 });
    }
    const { identifier, otp, type: _type } = parsed.data;

    await connectDB();
    const result = await verifyStoredOTP(identifier, otp);

    if (!result.success) {
      return NextResponse.json(errorResponse("INVALID_OTP", result.message), { status: 400 });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });
    if (!user) {
      return NextResponse.json(errorResponse("NOT_FOUND", "User not found"), { status: 404 });
    }

    const token = generateToken({
      userId: String(user._id),
      role: user.role,
      permissions: user.permissions,
      sessionVersion: user.sessionVersion,
    });

    const cookieStore = await cookies();
    cookieStore.set("m2s_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    user.lastLoginAt = new Date();
    await user.save();

    const { passwordHash, ...userWithoutPassword } = user.toObject();

    logger.info("OTP login successful", "auth", { userId: user._id });

    try {
      const guestId = cookieStore.get("m2s_guest")?.value;
      if (guestId) {
        const { CartService } = await import("@/services/cart.service");
        const { WishlistService } = await import("@/services/wishlist.service");
        await CartService.mergeGuestIntoUser(guestId, String(user._id));
        await WishlistService.mergeGuestIntoUser(guestId, String(user._id));
      }
    } catch (mergeErr) {
      logger.warn("Cart merge on OTP login failed", "auth", { mergeErr: String(mergeErr) });
    }

    return NextResponse.json(successResponse(userWithoutPassword));
  } catch (error) {
    logger.error("Verify OTP error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Verification failed"), { status: 500 });
  }
}
