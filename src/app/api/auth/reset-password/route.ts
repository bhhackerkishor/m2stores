import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyStoredOTP } from "@/lib/otp";
import { generateToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, otp, newPassword } = body;

    if (!identifier || !otp || !newPassword) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "All fields are required"), { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Password must be at least 8 characters"), { status: 400 });
    }

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

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.sessionVersion = (user.sessionVersion || 0) + 1; // Invalidate all sessions
    await user.save();

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

    logger.info("Password reset successful", "auth", { userId: user._id });
    return NextResponse.json(successResponse({ message: "Password reset successfully" }));
  } catch (error) {
    logger.error("Reset password error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to reset password"), { status: 500 });
  }
}
