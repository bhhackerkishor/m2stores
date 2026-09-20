import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/services/payment/phonepe.provider";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (!rawBody) {
      return NextResponse.json({ code: "BAD_REQUEST", message: "Empty body" }, { status: 400 });
    }

    // Standardize headers map for the payment provider interface
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const provider = getPaymentProvider("PHONEPE");
    const result = await provider.handleWebhook(rawBody, headers);

    // Return SUCCESS to acknowledge receipt to PhonePe
    return NextResponse.json({ code: "SUCCESS", ...result });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;

    if (statusCode === 401) {
      logger.error("Invalid PhonePe webhook signature", "payment", {
        xVerify: request.headers.get("x-verify"),
      });
      return NextResponse.json({ code: "SIGNATURE_ERROR" }, { status: 401 });
    }

    logger.error("PhonePe webhook processing failure", "payment", {
      error: String(error?.message || error),
    });

    // 404 = missing/unknown transaction (do not retry indefinitely)
    // 503 = provider unreachable (PhonePe will retry)
    // 500 = general failure (PhonePe will retry)
    if (statusCode === 404) {
      return NextResponse.json({ code: "TRANSACTION_NOT_FOUND" }, { status: 404 });
    }
    // Return 500/503 so PhonePe retries the webhook delivery
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}