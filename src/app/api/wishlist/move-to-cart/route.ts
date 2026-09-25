import { moveWishlistToCartSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { WishlistService } from "@/services/wishlist.service";
import { resolveIdentity } from "@/services/cart.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = moveWishlistToCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "sku is required"), { status: 400 });
    }
    const { sku, quantity } = parsed.data;
    const identity = await resolveIdentity();
    const cartView = await WishlistService.moveToCart(identity, sku, quantity ?? 1);
    return NextResponse.json(successResponse(cartView));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Move to cart error", "wishlist", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to move to cart"), { status: 500 });
  }
}
