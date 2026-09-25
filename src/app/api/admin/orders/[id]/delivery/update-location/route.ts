import { updateLocationSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { Order } from "@/models/Order";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";


/**
 * POST /api/admin/orders/[id]/delivery/update-location
 * Admin updates the current location of a shipment
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "orders.status.update" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Permission required"), { status: 403 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Location name is required"),
        { status: 400 }
      );
    }
    const { location, city, note, status } = parsed.data;

    await connectDB();
    const order: any = await Order.findOne({ orderNumber: id });
    if (!order) return NextResponse.json(errorResponse("NOT_FOUND", "Order not found"), { status: 404 });

    if (!["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.orderStatus)) {
      return NextResponse.json(errorResponse("INVALID_STATUS", "Order must be SHIPPED or OUT_FOR_DELIVERY"), { status: 400 });
    }

    order.shippingDetails = {
      ...(order.shippingDetails || {}),
      currentlyAt: location.trim(),
      events: [
        ...((order.shippingDetails?.events as any[]) || []),
        {
          status: status || order.orderStatus,
          location: location.trim(),
          city: city?.trim() || undefined,
          timestamp: new Date(),
          note: note?.trim() || `Package arrived at ${location.trim()}`,
        },
      ],
    };
    await order.save();

    logger.info("Delivery location updated", "shipping", { orderNumber: id, location: location.trim() });
    return NextResponse.json(successResponse({ shippingDetails: order.shippingDetails }));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Update delivery location error", "shipping", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update location"), { status: 500 });
  }
}
