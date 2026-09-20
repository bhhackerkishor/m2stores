import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/auth-server";
import { PaymentService } from "@/services/payment/payment.service";
import { Order } from "@/models/Order";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const schema = z.object({
  orderNumber: z.string().min(1).max(64),
  idempotencyKey: z.string().uuid().optional(),
});

/** Generic initiate — resolves the provider from the order. No provider logic here. */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) {
      return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "orderNumber is required"), { status: 400 });
    }

    await connectDB();
    const order: any = await Order.findOne({ orderNumber: parsed.data.orderNumber, userId: session.userId }).lean();
    if (!order) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Order not found"), { status: 404 });
    }

    const out = await PaymentService.initiate(parsed.data.orderNumber, parsed.data.idempotencyKey);
    const redirectUrl = out.redirect?.redirectUrl;

    if (!redirectUrl) {
      return NextResponse.json(
        errorResponse("PROVIDER_ERROR", "Payment gateway failed to generate redirect URL"),
        { status: 502 }
      );
    }

    return NextResponse.json(
      successResponse({
        redirectUrl,
        paymentId: out.redirect.paymentId,
        providerPaymentId: out.redirect.providerPaymentId,
        status: out.redirect.status,
      })
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("PhonePe initiate error", "payment", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to initiate payment"), { status: 500 });
  }
}