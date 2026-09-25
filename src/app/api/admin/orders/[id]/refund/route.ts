import { adminRefundSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentService } from "@/services/payment/payment.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session)
      return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "refunds.trigger" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Refund permission required"), { status: 403 });
    }

    const { id: orderNumber } = await params;
    const body = await request.json().catch(() => null);
    const parsed = adminRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Refund reason is required (min 3 chars)"),
        { status: 400 }
      );
    }
    const { amount, reason } = parsed.data;

    await connectDB();
    const order: any = await Order.findOne({ orderNumber });
    if (!order) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Order not found"), { status: 404 });
    }

    const payment: any = await Payment.findOne({ orderId: order._id });
    if (!payment || payment.status !== "PAID") {
      return NextResponse.json(
        errorResponse("INVALID_STATUS", "No paid payment found for this order"),
        { status: 400 }
      );
    }

    const refundAmount = amount ?? order.pricingSnapshot.grandTotal;
    if (refundAmount > order.pricingSnapshot.grandTotal) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Refund amount cannot exceed order total"),
        { status: 400 }
      );
    }

    let refundResult;
    try {
      refundResult = await PaymentService.refund(orderNumber, refundAmount, reason);
    } catch (e: any) {
      logger.error("Refund failed", "order", { orderNumber, error: String(e?.message || e) });
      return NextResponse.json(
        errorResponse("REFUND_FAILED", "Refund could not be processed"),
        { status: 500 }
      );
    }

    order.orderStatus = "REFUND_PENDING";
    order.statusHistory.push({
      status: "REFUND_PENDING",
      timestamp: new Date(),
      updatedBy: session.userId as any,
      notes: `Refund initiated: ₹${refundAmount} — ${reason}`,
    });
    await order.save();

    try {
      const { NotificationService } = await import("@/services/notification/notification.service");
      await NotificationService.notify("RETURN_UPDATE", {
        userId: String(order.userId),
        orderNumber,
        message: `Your refund of ₹${refundAmount} for order ${orderNumber} has been initiated. It will be processed shortly.`,
      });
    } catch {
      // notification failure is non-blocking
    }

    logger.info("Refund initiated", "order", { orderNumber, amount: refundAmount, adminId: session.userId });

    return NextResponse.json(
      successResponse({
        order: order.toObject(),
        refund: refundResult,
      })
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Admin refund error", "order", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Refund failed"), { status: 500 });
  }
}
