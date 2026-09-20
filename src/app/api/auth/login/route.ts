import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { SignOptions as JwtSignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { loginSchema } from "@/validators/auth";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", validation.error.errors[0]?.message || "Invalid input"), { status: 400 });
    }

    await connectDB();
    const { identifier, password, otp, rememberMe } = validation.data;

    // Per-identifier brute-force guard (in addition to IP limit in middleware)
    const { checkRateLimit: check, LIMITS: L } = await import("@/lib/rate-limit");
    const idLimit = check("auth-id", String(identifier).toLowerCase(), L.authIdentifier.limit, L.authIdentifier.windowMs);
    if (!idLimit.allowed) {
      return NextResponse.json(errorResponse("INVALID_CREDENTIALS", "Invalid email/phone or password"), { status: 401 });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    }).select("+passwordHash +otp +otpExpiresAt");

    if (!user) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Invalid credentials"), { status: 401 });
    }

    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      return NextResponse.json(errorResponse("ACCOUNT_BLOCKED", "Your account has been blocked"), { status: 403 });
    }

    // OTP Flow
    if (otp) {
      if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        return NextResponse.json(errorResponse("OTP_EXPIRED", "OTP has expired"), { status: 400 });
      }
      const otpMatch = await bcrypt.compare(otp, user.otp);
      if (!otpMatch) {
        return NextResponse.json(errorResponse("INVALID_OTP", "Invalid OTP"), { status: 400 });
      }
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = 0;
      await user.save();
    } else if (password) {
      // Password Flow
      const passwordMatch = await bcrypt.compare(password, user.passwordHash!);
      if (!passwordMatch) {
        return NextResponse.json(errorResponse("INVALID_CREDENTIALS", "Invalid email/phone or password"), { status: 401 });
      }
    } else {
      return NextResponse.json(errorResponse("MISSING_CREDENTIALS", "Please provide password or OTP"), { status: 400 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, permissions: user.permissions, sessionVersion: user.sessionVersion },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    const cookieStore = await cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    cookieStore.set("m2s_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    const { passwordHash, ...userWithoutPassword } = user.toObject();
    logger.info("User logged in", "auth", { userId: user._id, role: user.role });

    // Merge guest cart/wishlist into user cart on login
    try {
      const guestId = cookieStore.get("m2s_guest")?.value;
      if (guestId) {
        const { CartService } = await import("@/services/cart.service");
        const { WishlistService } = await import("@/services/wishlist.service");
        await CartService.mergeGuestIntoUser(guestId, String(user._id));
        await WishlistService.mergeGuestIntoUser(guestId, String(user._id));
      }
    } catch (mergeErr) {
      logger.warn("Cart merge on login failed", "auth", { mergeErr: String(mergeErr) });
    }

    return NextResponse.json(successResponse(userWithoutPassword));
  } catch (error) {
    logger.error("Login error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "An error occurred during login"), { status: 500 });
  }
}
