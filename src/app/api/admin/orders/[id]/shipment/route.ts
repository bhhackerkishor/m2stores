import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { ShippingService } from "@/services/shipping.service";
import { shipmentSchema, trackingEventSchema } from "@/validators/fulfillment";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "shipping.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Shipping permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = shipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid shipment"), { status: 400 });
    }
    const details = await ShippingService.createShipment(id, parsed.data, session.userId);
    return NextResponse.json(successResponse(details), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create shipment error", "shipping", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "shipping.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Shipping permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = trackingEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid event"), { status: 400 });
    }
    const details = await ShippingService.addTrackingEvent(id, parsed.data);
    return NextResponse.json(successResponse(details));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Tracking event error", "shipping", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed"), { status: 500 });
  }
}
