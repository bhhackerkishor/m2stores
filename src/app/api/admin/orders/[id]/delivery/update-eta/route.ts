import { updateEtaSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { Order } from "@/models/Order";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";


/**
 * POST /api/admin/orders/[id]/delivery/update-eta
 * Admin updates estimated delivery date with reason for customer visibility
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
    const parsed = updateEtaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Estimated delivery date is required"),
        { status: 400 }
      );
    }
    const { estimatedDelivery, reason } = parsed.data;

    const newDate = new Date(estimatedDelivery);
    if (isNaN(newDate.getTime()) || newDate < new Date()) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Delivery date must be a valid future date"), { status: 400 });
    }

    await connectDB();
    const order: any = await Order.findOne({ orderNumber: id });
    if (!order) return NextResponse.json(errorResponse("NOT_FOUND", "Order not found"), { status: 404 });

    if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.orderStatus)) {
      return NextResponse.json(errorResponse("INVALID_STATUS", "Cannot update ETA for this order status"), { status: 400 });
    }

    const previousDate = order.shippingDetails?.estimatedDelivery || null;

    order.shippingDetails = {
      ...(order.shippingDetails || {}),
      estimatedDelivery: newDate,
      deliveryChanges: [
        ...((order.shippingDetails?.deliveryChanges as any[]) || []),
        {
          previousDate,
          newDate,
          reason: reason.trim(),
          changedBy: session.userId,
          changedAt: new Date(),
        },
      ],
      events: [
        ...((order.shippingDetails?.events as any[]) || []),
        {
          status: order.orderStatus,
          timestamp: new Date(),
          note: `Estimated delivery updated to ${newDate.toLocaleDateString("en-IN")}: ${reason.trim()}`,
        },
      ],
    };
    await order.save();

    logger.info("Delivery ETA updated", "shipping", {
      orderNumber: id,
      previousDate: previousDate?.toISOString(),
      newDate: newDate.toISOString(),
      reason: reason.trim(),
    });
    return NextResponse.json(successResponse({ shippingDetails: order.shippingDetails }));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Update delivery ETA error", "shipping", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update delivery date"), { status: 500 });
  }
}
