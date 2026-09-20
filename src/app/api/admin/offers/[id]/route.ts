import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Offer } from "@/models/Offer";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { updateOfferSchema } from "@/validators/marketing";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "offers.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Offers write permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid offer"), { status: 400 });
    }
    await connectDB();
    const norm: any = { ...parsed.data };
    if (norm.startDate) norm.startDate = new Date(norm.startDate);
    if (norm.expiryDate) norm.expiryDate = new Date(norm.expiryDate);
    const updated: any = await Offer.findByIdAndUpdate(id, { $set: norm }, { new: true }).lean();
    if (!updated) return NextResponse.json(errorResponse("NOT_FOUND", "Offer not found"), { status: 404 });
    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Update offer error", "offer", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update offer"), { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "offers.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Offers write permission required"), { status: 403 });
    }
    const { id } = await params;
    await connectDB();
    const deleted = await Offer.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json(errorResponse("NOT_FOUND", "Offer not found"), { status: 404 });
    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error: any) {
    logger.error("Delete offer error", "offer", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to delete offer"), { status: 500 });
  }
}
