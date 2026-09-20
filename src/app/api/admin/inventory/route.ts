import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InventoryState } from "@/models/Inventory";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const q = searchParams.get("q") || "";
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const filter: any = {};
    if (q) filter.sku = { $regex: q.toUpperCase(), $options: "i" };
    if (lowStockOnly) filter.$expr = { $lt: [{ $subtract: ["$stock", "$reservedStock"] }, "$lowStockThreshold"] };

    const total = await InventoryState.countDocuments(filter);
    const items = await InventoryState.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("productId", "name slug images")
      .lean();

    const mapped = items.map((s: any) => ({
      ...s,
      available: s.stock - s.reservedStock,
      isLowStock: s.stock - s.reservedStock < (s.lowStockThreshold ?? 5),
    }));

    return NextResponse.json(paginatedResponse(mapped, page, limit, total));
  } catch (error) {
    logger.error("Admin inventory list error", "inventory", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list inventory"), { status: 500 });
  }
}
