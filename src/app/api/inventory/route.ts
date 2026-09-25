import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InventoryState } from "@/models/Inventory";
import { Product } from "@/models/Product";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { inventoryCheckQuerySchema, inventoryCheckSchema } from "@/validators/catalog";

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = inventoryCheckQuerySchema.safeParse(raw);
    if (!parsedQuery.success || (!parsedQuery.data.sku && !parsedQuery.data.productId)) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "sku or productId query parameter is required"), { status: 400 });
    }
    const { sku, productId } = parsedQuery.data;

    await connectDB();

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
    const body = await request.json().catch(() => null);
    const parsed = inventoryCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "productId, sku, and quantity are required"), { status: 400 });
    }
    const { productId, sku, quantity } = parsed.data;

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
