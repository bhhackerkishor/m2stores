import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { ReturnService } from "@/services/return.service";
import { returnActionSchema } from "@/validators/fulfillment";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "returns.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Returns permission required"), { status: 403 });
    }
    const { id } = await params;
    return NextResponse.json(successResponse(await ReturnService.adminGet(id)));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "returns.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Returns write permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = returnActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid action"), { status: 400 });
    }
    const { action, reason, pickupStatus, notes } = parsed.data;
    let out;
    if (action === "approve") out = await ReturnService.approve(id, session.userId, pickupStatus || "SCHEDULED", notes);
    else if (action === "reject") {
      if (!reason) return NextResponse.json(errorResponse("VALIDATION_ERROR", "Rejection reason required"), { status: 400 });
      out = await ReturnService.reject(id, session.userId, reason);
    } else if (action === "receive") out = await ReturnService.receive(id, session.userId);
    else out = await ReturnService.refund(id, session.userId);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Return action error", "return", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Action failed"), { status: 500 });
  }
}
