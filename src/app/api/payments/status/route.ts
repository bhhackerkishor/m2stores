import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { PaymentService } from "@/services/payment/payment.service";
import { Order } from "@/models/Order";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) {
      return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    }

    const orderNumber = request.nextUrl.searchParams.get("orderNumber");
    if (!orderNumber) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "orderNumber query parameter is required"),
        { status: 400 }
      );
    }

    await connectDB();
    const order: any = await Order.findOne({ orderNumber, userId: session.userId }).lean();
    if (!order) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Order not found"), { status: 404 });
    }

    // Polls provider status endpoint & syncs DB state
    const out = await PaymentService.syncStatus(orderNumber);

    return NextResponse.json(
      successResponse({
        status: out.status,
        order: out.order,
        payment: out.payment,
      })
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }

    logger.error("Payment status sync error", "payment", {
      error: String(error?.message || error),
    });

    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "Failed to check status with payment provider"),
      { status: 500 }
    );
  }
}