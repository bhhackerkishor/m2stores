import { forgotPasswordRequestSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { generateOTP, hashOTP } from "@/lib/otp";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Email or phone is required"), { status: 400 });
    }
    const { identifier } = parsed.data;

    await connectDB();
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });

    if (!user) {
      return NextResponse.json(successResponse({ message: "If an account exists, a reset OTP has been sent" }));
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    user.otp = otpHash;
    user.otpExpiresAt = new Date(Date.now() + 3600000); // 1 hour expiry
    user.otpAttempts = 0;
    await user.save();

    logger.info("Password reset OTP sent", "auth", { identifier });
    if (process.env.NODE_ENV !== "production") {
      logger.info(`OTP for ${identifier}: ${otp}`, "auth-dev");
    }

    return NextResponse.json(successResponse({ message: "Password reset OTP sent" }));
  } catch (error) {
    logger.error("Forgot password error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to process request"), { status: 500 });
  }
}
