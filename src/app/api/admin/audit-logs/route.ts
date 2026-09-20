import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "audit.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Audit permission required"), { status: 403 });
    }
    await connectDB();
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "25")));
    const filter: any = {};
    if (sp.get("action")) filter.action = sp.get("action");
    if (sp.get("entity")) filter.entity = sp.get("entity");
    const total = await AuditLog.countDocuments(filter);
    const items = await AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).populate("admin", "name email").lean();
    return NextResponse.json(paginatedResponse(items, page, limit, total));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Audit logs error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list audit logs"), { status: 500 });
  }
}
