import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment/payment.service";
import { Payment } from "@/models/Payment";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Browser redirect target after PhonePe Pay Page.
 * NEVER trusts query params — re-verifies via Status API before redirecting.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const mtxn = request.nextUrl.searchParams.get("mtxn");
    if (!mtxn) return NextResponse.redirect(`${appUrl}/order-success?error=missing_txn`);
    await connectDB();
    const payment: any = await Payment.findOne({ merchantTransactionId: mtxn }).lean();
    if (!payment) return NextResponse.redirect(`${appUrl}/order-success?error=payment_not_found`);
    const { Order } = await import("@/models/Order");
    const order: any = await Order.findById(payment.orderId).lean();
    const out = await PaymentService.syncStatus(order.orderNumber).catch(() => null);
    const status = (out as any)?.status || payment.status;
    if (status === "PAID") {
      return NextResponse.redirect(`${appUrl}/order-success?orderNumber=${order.orderNumber}&method=PHONEPE&paid=1`);
    }
    if (status === "PENDING") {
      return NextResponse.redirect(`${appUrl}/order-success?orderNumber=${order.orderNumber}&method=PHONEPE&pending=1`);
    }
    return NextResponse.redirect(`${appUrl}/order-success?orderNumber=${order.orderNumber}&method=PHONEPE&failed=1`);
  } catch (error) {
    logger.error("PhonePe callback error", "payment", { error: String(error) });
    return NextResponse.redirect(`${appUrl}/order-success?error=callback_failed`);
  }
}
