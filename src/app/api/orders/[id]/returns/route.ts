import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { ReturnService } from "@/services/return.service";
import { requestReturnSchema } from "@/validators/fulfillment";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const { id } = await params;
    const { connectDB } = await import("@/lib/db");
    const { ReturnRequest } = await import("@/models/ReturnRequest");
    await connectDB();
    const items = await ReturnRequest.find({ orderNumber: id, userId: session.userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(successResponse(items));
  } catch (error: any) {
    logger.error("List returns error", "return", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const parsed = requestReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid return"), { status: 400 });
    }
    const out = await ReturnService.request(session.userId, id, parsed.data);
    return NextResponse.json(successResponse(out), { status: out.duplicate ? 200 : 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Request return error", "return", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Return request failed"), { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const returnId = new URL(_request.url).searchParams.get("returnId");
    if (!returnId) return NextResponse.json(errorResponse("VALIDATION_ERROR", "returnId is required"), { status: 400 });
    const out = await ReturnService.customerCancel(returnId, session.userId);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
