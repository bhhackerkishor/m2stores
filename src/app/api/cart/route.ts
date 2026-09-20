import { NextRequest, NextResponse } from "next/server";
import { CartService, resolveIdentity } from "@/services/cart.service";
import { addToCartSchema, updateCartItemSchema } from "@/validators/cart";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const identity = await resolveIdentity();
    const useCOD = new URL(request.url).searchParams.get("cod") === "true";
    const view = await CartService.view(identity, { useCOD });
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    logger.error("Get cart error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch cart"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = addToCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }
    const identity = await resolveIdentity();
    const view = await CartService.add(identity, parsed.data);
    return NextResponse.json(successResponse(view), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Add to cart error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to add item to cart"), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }
    const identity = await resolveIdentity();
    const view = await CartService.updateQty(identity, parsed.data.sku, parsed.data.quantity);
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Update cart error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update cart"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await resolveIdentity();
    const sku = new URL(request.url).searchParams.get("sku");
    const view = sku ? await CartService.remove(identity, sku) : await CartService.clear(identity);
    return NextResponse.json(successResponse(view));
  } catch (error: any) {
    logger.error("Delete cart error", "cart", { error: String(error?.message || error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update cart"), { status: 500 });
  }
}
