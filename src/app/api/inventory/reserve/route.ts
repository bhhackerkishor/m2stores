import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { reserveSchema } from "@/validators/inventory";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }
    const result = await InventoryService.reserve(parsed.data);
    return NextResponse.json(successResponse(result), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Reserve API error", "inventory", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to reserve inventory"), { status: 500 });
  }
}
