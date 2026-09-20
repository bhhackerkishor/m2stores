import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "payments.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Payments permission required"), { status: 403 });
    }
    await connectDB();
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "20")));
    const filter: any = {};
    if (sp.get("status")) filter.status = sp.get("status");
    if (sp.get("provider")) filter.provider = sp.get("provider");
    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return NextResponse.json(paginatedResponse(items, page, limit, total));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin payments error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list payments"), { status: 500 });
  }
}
