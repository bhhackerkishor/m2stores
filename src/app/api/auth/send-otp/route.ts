import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { generateOTP, hashOTP, storeOTP } from "@/lib/otp";
import { checkRateLimit, clientIp, LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

const schema = z.object({
  identifier: z.string().trim().min(5).max(100),
  type: z.enum(["login", "register", "password-reset"]).optional(),
});

const RESEND_GAP_MS = 30_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Phone number or email is required"), { status: 400 });
    }
    const { identifier } = parsed.data;

    // Per-identifier throttle: 3 sends / 10 min (brute-force + SMS cost protection)
    const idKey = identifier.toLowerCase();
    const idLimit = await checkRateLimit("otp-send-id", idKey, LIMITS.otpSend.limit, LIMITS.otpSend.windowMs);
    if (!idLimit.allowed) {
      // Generic message — no enumeration, no timing oracle
      return NextResponse.json(successResponse({ message: "If an account exists, an OTP has been sent" }));
    }
    const ipLimit = await checkRateLimit("otp-send-ip", clientIp(request), LIMITS.otpSend.limit * 5, LIMITS.otpSend.windowMs);
    if (!ipLimit.allowed) {
      return NextResponse.json(successResponse({ message: "If an account exists, an OTP has been sent" }));
    }

    await connectDB();

    const user: any = await User.findOne({
      $or: [{ email: idKey }, { phone: identifier }],
    }).select("+otpSentAt");

    if (!user) {
      // Return success even for non-existent users to prevent enumeration
      return NextResponse.json(successResponse({ message: "If an account exists, an OTP has been sent" }));
    }

    // Minimum resend interval (prevents rapid-fire SMS + OTP guessing windows)
    if (user.otpSentAt && Date.now() - new Date(user.otpSentAt).getTime() < RESEND_GAP_MS) {
      return NextResponse.json(successResponse({ message: "If an account exists, an OTP has been sent" }));
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(identifier, otpHash, otp);

    logger.info("OTP generated", "auth", { userId: String(user._id) });

    // Dev-only: log OTP server-side for testing. NEVER expose in response.
    if (process.env.NODE_ENV !== "production") {
      logger.info(`OTP for ${identifier}: ${otp}`, "auth-dev");
    }
    return NextResponse.json(successResponse({ message: "OTP sent successfully" }));
  } catch (error) {
    logger.error("Send OTP error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to send OTP"), { status: 500 });
  }
}
