import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { SupportService } from "@/services/support.service";
import { replySchema } from "@/validators/engagement";
import { connectDB } from "@/lib/db";
import { SupportTicket } from "@/models/SupportTicket";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "support.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Support permission required"), { status: 403 });
    }
    const { id } = await params;
    await connectDB();
    const t: any = await SupportTicket.findById(id).populate("user", "name email phone").lean();
    if (!t) return NextResponse.json(errorResponse("NOT_FOUND", "Ticket not found"), { status: 404 });
    return NextResponse.json(successResponse(t));
  } catch (error: any) {
    logger.error("Admin ticket get error", "support", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "support.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Support write permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid reply"), { status: 400 });
    }
    const out = await SupportService.adminReply(id, session.userId, parsed.data.content, parsed.data.nextStatus as any);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin reply error", "support", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
