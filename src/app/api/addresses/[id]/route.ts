import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { AddressService } from "@/services/address.service";
import { updateAddressSchema } from "@/validators/address";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

async function requireUser() {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session?.userId) throw new AppError("Login required", 401, "UNAUTHORIZED");
  return session.userId;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const { id } = await params;
    const body = await request.json();
    if (body.setDefault === true) {
      const addr = await AddressService.setDefault(userId, id);
      return NextResponse.json(successResponse(addr));
    }
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid address", parsed.error.flatten()), { status: 400 });
    }
    const addr = await AddressService.update(userId, id, parsed.data);
    return NextResponse.json(successResponse(addr));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Update address error", "address", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update address"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const { id } = await params;
    const out = await AddressService.remove(userId, id);
    return NextResponse.json(successResponse(out));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Delete address error", "address", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to delete address"), { status: 500 });
  }
}
