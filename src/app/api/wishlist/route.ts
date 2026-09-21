import { NextRequest, NextResponse } from "next/server";
import { WishlistService } from "@/services/wishlist.service";
import { resolveIdentity } from "@/services/cart.service";
import { addToWishlistSchema } from "@/validators/cart";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const identity = await resolveIdentity();
    const view = await WishlistService.view(identity);
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    logger.error("Get wishlist error", "wishlist", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch wishlist"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = addToWishlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "productId or sku is required"), { status: 400 });
    }
    const identity = await resolveIdentity();
    const view = await WishlistService.add(identity, parsed.data);
    console.log(view,identity)
    return NextResponse.json(successResponse(view), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Add wishlist error", "wishlist", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to add to wishlist"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await resolveIdentity();
    const sku = new URL(request.url).searchParams.get("sku");
    if (!sku) return NextResponse.json(errorResponse("VALIDATION_ERROR", "sku is required"), { status: 400 });
    const view = await WishlistService.remove(identity, sku);
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    logger.error("Remove wishlist error", "wishlist", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to remove"), { status: 500 });
  }
}
