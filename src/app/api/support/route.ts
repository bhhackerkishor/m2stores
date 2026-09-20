import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { SupportService } from "@/services/support.service";
import { createTicketSchema, replySchema } from "@/validators/engagement";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const status = new URL(request.url).searchParams.get("status") || undefined;
    return NextResponse.json(successResponse(await SupportService.listForUser(session.userId, status)));
  } catch (error: any) {
    logger.error("List tickets error", "support", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid ticket"), { status: 400 });
    }
    const created = await SupportService.createTicket(session.userId, parsed.data);
    return NextResponse.json(successResponse(created), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create ticket error", "support", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
