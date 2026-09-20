import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Offer } from "@/models/Offer";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { createOfferSchema, updateOfferSchema } from "@/validators/marketing";
import { AuditLog } from "@/models/AuditLog";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

function norm(data: any) {
  const out: any = { ...data };
  if (out.startDate) out.startDate = new Date(out.startDate);
  if (out.expiryDate) out.expiryDate = new Date(out.expiryDate);
  return out;
}

export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "offers.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Offers permission required"), { status: 403 });
    }
    await connectDB();
    return NextResponse.json(successResponse(await Offer.find().sort({ createdAt: -1 }).lean()));
  } catch (error: any) {
    logger.error("List offers error", "offer", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list offers"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "offers.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Offers write permission required"), { status: 403 });
    }
    const body = await request.json();
    const parsed = createOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid offer", parsed.error.flatten()), { status: 400 });
    }
    await connectDB();
    const created = await Offer.create(norm(parsed.data));
    try {
      await AuditLog.create({ admin: session.userId as any, action: "OFFER_CREATED", entity: "Offer", entityId: String(created._id), timestamp: new Date() });
    } catch { /* best-effort */ }
    return NextResponse.json(successResponse(created.toObject()), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create offer error", "offer", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create offer"), { status: 500 });
  }
}
