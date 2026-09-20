import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { SignOptions as JwtSignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { registerSchema } from "@/validators/auth";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", validation.error.errors[0]?.message || "Invalid input"), { status: 400 });
    }

    await connectDB();
    const { name, email, phone, password } = validation.data;

    const existingUser = await User.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
    });

    if (existingUser) {
      return NextResponse.json(errorResponse("CONFLICT", "An account with this email or phone already exists"), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email?.toLowerCase(),
      phone,
      passwordHash,
      role: "CUSTOMER",
      permissions: [
        "products.read", "categories.read", "brands.read",
        "orders.read", "customers.read",
        "reviews.write", "support.write",
      ],
      isPhoneVerified: false,
      isEmailVerified: false,
      status: "ACTIVE",
      sessionVersion: 1,
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role, permissions: user.permissions, sessionVersion: user.sessionVersion },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as JwtSignOptions
    );

    const cookieStore = await cookies();
    cookieStore.set("m2s_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    const { passwordHash: pw, ...userWithoutPassword } = user.toObject();
    logger.info("User registered", "auth", { userId: user._id });

    try {
      const guestId = cookieStore.get("m2s_guest")?.value;
      if (guestId) {
        const { CartService } = await import("@/services/cart.service");
        const { WishlistService } = await import("@/services/wishlist.service");
        await CartService.mergeGuestIntoUser(guestId, String(user._id));
        await WishlistService.mergeGuestIntoUser(guestId, String(user._id));
      }
    } catch (mergeErr) {
      logger.warn("Cart merge on register failed", "auth", { mergeErr: String(mergeErr) });
    }

    return NextResponse.json(successResponse(userWithoutPassword), { status: 201 });
  } catch (error) {
    logger.error("Registration error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "An error occurred during registration"), { status: 500 });
  }
}


