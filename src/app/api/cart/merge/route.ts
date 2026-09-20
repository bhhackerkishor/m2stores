import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/auth-server";
import { CartService } from "@/services/cart.service";
import { WishlistService } from "@/services/wishlist.service";
import { GUEST_COOKIE } from "@/services/cart.service";
import { mergeCartSchema } from "@/validators/cart";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

/**
 * Merge a guest cart/wishlist into the logged-in user.
 * Called explicitly after login, and also auto-attempted using the guest cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session?.userId) {
      return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required to merge cart"), { status: 401 });
    }
    const cookieStore = await cookies();
    const cookieGuest = cookieStore.get(GUEST_COOKIE)?.value;
    const body = await request.json().catch(() => ({}));
    const parsed = mergeCartSchema.safeParse({ guestSessionId: body.guestSessionId || cookieGuest });
    if (!parsed.success) {
      return NextResponse.json(successResponse({ merged: 0, message: "No guest cart to merge" }));
    }
    const cart = await CartService.mergeGuestIntoUser(parsed.data.guestSessionId, session.userId);
    const wishlist = await WishlistService.mergeGuestIntoUser(parsed.data.guestSessionId, session.userId);
    return NextResponse.json(successResponse({ ...cart, wishlistMerged: wishlist.merged }));
  } catch (error: any) {
    logger.error("Merge cart error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to merge cart"), { status: 500 });
  }
}
