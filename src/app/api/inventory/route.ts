import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InventoryState } from "@/models/Inventory";
import { Product } from "@/models/Product";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sku = searchParams.get("sku");
    const productId = searchParams.get("productId");

    await connectDB();

    if (!sku && !productId) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "sku or productId query parameter is required"), { status: 400 });
    }

    const filter: any = {};
    if (sku) filter.sku = sku.toUpperCase();
    if (productId) filter.productId = productId;

    const inventory = await InventoryState.find(filter).select("+stock +reservedStock");

    const result = inventory.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      stock: item.stock,
      reservedStock: item.reservedStock,
      available: item.stock - item.reservedStock,
      lowStock: item.stock - item.reservedStock < item.lowStockThreshold,
    }));

    return NextResponse.json(successResponse(result));
  } catch (error) {
    logger.error("Inventory check error", "inventory", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to check inventory"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, sku, quantity } = body;

    if (!productId || !sku || !quantity || quantity < 1) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "productId, sku, and quantity are required"), { status: 400 });
    }

    await connectDB();

    const inventory = await InventoryState.findOne({ productId, sku: sku.toUpperCase() });
    if (!inventory) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Inventory record not found"), { status: 404 });
    }

    const available = inventory.stock - inventory.reservedStock;
    const hasStock = available >= quantity;

    return NextResponse.json(successResponse({
      productId,
      sku,
      requestedQuantity: quantity,
      available,
      hasStock: hasStock,
      message: hasStock ? "Stock available" : `Only ${available} units available`,
    }));
  } catch (error) {
    logger.error("Inventory check POST error", "inventory", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to check inventory"), { status: 500 });
  }
}
