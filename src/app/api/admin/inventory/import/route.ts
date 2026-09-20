import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { InventoryState } from "@/models/Inventory";
import { Product } from "@/models/Product";
import { InventoryService } from "@/services/inventory.service";
import { parseCsv, toCsv } from "@/lib/csv";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "reports.export" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Export permission required"), { status: 403 });
    }
    await connectDB();
    const states: any[] = await InventoryState.find().limit(10000).lean();
    const headers = ["sku", "productId", "stock", "reserved", "available"];
    const rows = states.map((s) => [s.sku, String(s.productId), s.stock, s.reservedStock, s.stock - s.reservedStock]);
    return new NextResponse(toCsv(headers, rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="m2stores-inventory-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  } catch (error: any) {
    logger.error("Inventory export error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Export failed"), { status: 500 });
  }
}

/**
 * Inventory CSV import. Headers: sku,stock  OR  productSlug,sku,stock.
 * Sets absolute stock via adjust delta (audit-logged per row).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "inventory.adjust" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Inventory adjust permission required"), { status: 403 });
    }
    const text = await request.text();
    if (!text.trim()) return NextResponse.json(errorResponse("VALIDATION_ERROR", "Empty CSV body"), { status: 400 });
    const { headers, rows } = parseCsv(text);
    if (!headers.includes("sku") || !headers.includes("stock")) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Required headers: sku,stock"), { status: 400 });
    }
    await connectDB();
    const si = headers.indexOf("sku");
    const qi = headers.indexOf("stock");
    const pi = headers.indexOf("productId");
    const gi = headers.indexOf("productSlug");
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const lineNo = i + 2;
      try {
        const sku = (rows[i][si] || "").trim().toUpperCase();
        const stock = parseInt(rows[i][qi] || "", 10);
        if (!sku || Number.isNaN(stock) || stock < 0) throw new Error("sku and stock>=0 required");
        let state: any = null;
        if (pi >= 0 && (rows[i][pi] || "").trim()) {
          state = await InventoryState.findOne({ productId: (rows[i][pi] || "").trim(), sku }).lean();
        } else if (gi >= 0 && (rows[i][gi] || "").trim()) {
          const prod: any = await Product.findOne({ slug: (rows[i][gi] || "").trim().toLowerCase() }).lean();
          if (!prod) throw new Error(`unknown productSlug '${rows[i][gi]}'`);
          state = await InventoryState.findOne({ productId: prod._id, sku }).lean();
        } else {
          state = await InventoryState.findOne({ sku }).lean();
        }
        if (!state) throw new Error(`inventory row not found for sku '${sku}'`);
        const delta = stock - state.stock;
        if (delta !== 0) {
          await InventoryService.adjust({ productId: String(state.productId), sku, delta, reason: `CSV import set stock to ${stock}`, performedBy: session.userId });
        }
        updated++;
      } catch (e: any) {
        errors.push({ row: lineNo, message: e?.message || "Row failed" });
      }
    }
    return NextResponse.json(successResponse({ updated, failed: errors.length, errors: errors.slice(0, 100) }));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Inventory import error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Import failed"), { status: 500 });
  }
}
