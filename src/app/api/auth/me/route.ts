import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("m2s_token")?.value;

    if (!token) {
      return NextResponse.json(errorResponse("UNAUTHORIZED", "No authentication token provided"), { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string; permissions: string[] };
    await connectDB();

    const user = await User.findById(decoded.userId).select("-passwordHash -otp -otpExpiresAt");
    if (!user) {
      return NextResponse.json(errorResponse("NOT_FOUND", "User not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(user));
  } catch (error) {
    logger.error("Get me error", "auth", { error });
    return NextResponse.json(errorResponse("UNAUTHORIZED", "Invalid or expired token"), { status: 401 });
  }
}
