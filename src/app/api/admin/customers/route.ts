import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { SupportTicket } from "@/models/SupportTicket";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "customers.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Customers permission required"), { status: 403 });
    }
    await connectDB();
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "20")));
    const q = sp.get("q") || "";
    const filter: any = { role: "CUSTOMER" };
    if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }, { phone: { $regex: q, $options: "i" } }];
    const total = await User.countDocuments(filter);
    const users: any[] = await User.find(filter).select("-passwordHash -otp -otpExpiresAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return NextResponse.json(paginatedResponse(users, page, limit, total));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin customers error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list customers"), { status: 500 });
  }
}
