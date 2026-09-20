import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { CartService } from "@/services/cart.service";
import { AddressService } from "@/services/address.service";
import { ShippingService } from "@/services/shipping.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    const useCOD = new URL(request.url).searchParams.get("cod") === "true";
    const [cart, addresses] = await Promise.all([
      CartService.view({ userId: session.userId, isGuest: false }, { useCOD }),
      AddressService.list(session.userId),
    ]);
    const shippingOptions = await ShippingService.options(cart.pricing.subtotal - cart.pricing.couponDiscount, "STANDARD");
    const codPreview = addresses[0]
      ? await ShippingService.checkCOD(cart.pricing.subtotal - cart.pricing.couponDiscount, (addresses[0] as any).pincode).catch(() => ({ eligible: false, fee: 0 }))
      : { eligible: false, fee: 0 };
    return NextResponse.json(successResponse({ cart, addresses, shippingOptions, codPreview }));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Checkout summary error", "checkout", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load checkout"), { status: 500 });
  }
}
