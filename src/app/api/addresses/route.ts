import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { AddressService } from "@/services/address.service";
import { createAddressSchema } from "@/validators/address";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

async function requireUser() {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session?.userId) throw new AppError("Login required", 401, "UNAUTHORIZED");
  return session.userId;
}

export async function GET() {
  try {
    const userId = await requireUser();
    const list = await AddressService.list(userId);
    return NextResponse.json(successResponse(list));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("List addresses error", "address", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch addresses"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const body = await request.json();
    const parsed = createAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid address", parsed.error.flatten()), { status: 400 });
    }
    const addr = await AddressService.create(userId, parsed.data);
    return NextResponse.json(successResponse(addr), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create address error", "address", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create address"), { status: 500 });
  }
}
