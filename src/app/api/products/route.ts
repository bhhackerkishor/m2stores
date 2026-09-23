import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { CatalogService } from "@/services/catalog.service";
import { InventoryService } from "@/services/inventory.service";
import { createProductSchema } from "@/validators/product";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = request.nextUrl;

    // attr_<key>=v1,v2 (repeatable per key via comma list)
    const attrs: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith("attr_") && value) {
        attrs[key.slice(5)] = value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 10);
      }
    });

    const result = await CatalogService.listProducts({
      q: searchParams.get("q") || undefined,
      categoryId: searchParams.get("category") || undefined,
      brandId: searchParams.get("brand") || undefined,
      sort: (searchParams.get("sort") as any) || "relevance",
      minPrice: searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined,
      minRating: searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : undefined,
      inStock: searchParams.get("inStock") === "true" ? true : undefined,
      attrs: Object.keys(attrs).length ? attrs : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: Math.min(50, parseInt(searchParams.get("limit") || "12")),
      isFeatured: searchParams.get("isFeatured") === "true" ? true : undefined,
      isTrending: searchParams.get("isTrending") === "true" ? true : undefined,
      isBestseller: searchParams.get("isBestseller") === "true" ? true : undefined,
      status: searchParams.get("status") || "PUBLISHED",
    });

    const response = NextResponse.json(paginatedResponse(result.items, result.page, result.limit, result.total));
    response.headers.set("Cache-Control", "public, s-maxage=300, max-age=60, stale-while-revalidate=600");
    return response;
  } catch (error) {
    logger.error("Get products error", "product", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch products"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    const session = await requirePermission("products.write");
    const body = await request.json();
    for (const k of ["categoryId", "subcategoryId", "brandId"] as const) {
      if (body?.[k] === null || body?.[k] === "") body[k] = undefined;
    }
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const where = first?.path?.length ? `${first.path.join(".")}: ` : "";
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", `${where}${first?.message || "Invalid product data"}`, parsed.error.flatten()),
        { status: 400 }
      );
    }
    await connectDB();

    const existing = await Product.findOne({ slug: parsed.data.slug.toLowerCase() });
    if (existing) {
      return NextResponse.json(errorResponse("CONFLICT", "Product with this slug already exists"), { status: 409 });
    }

    // Strip inventory-only fields so Product never stores quantity (stock lives in InventoryState).
    const { initialStock: _initialStock, ...productPayload } = parsed.data as any & { initialStock?: number };
    if (Array.isArray(productPayload.variants)) {
      productPayload.variants = productPayload.variants.map(({ stock: _s, ...rest }: any) => rest);
    }
    const product = await Product.create({ ...productPayload, slug: parsed.data.slug.toLowerCase() });

    // Auto-generate baseSKU for simple products so inventory + cart SKU resolution always work.
    const useVariants = product.hasVariants && (product.variants?.length || 0) > 0;
    if (!useVariants && !product.baseSKU) {
      product.baseSKU = `SKU-${String(product._id).slice(0, 8).toUpperCase()}`;
      await product.save();
    }

    // Create InventoryState rows (form stock or 0) — without this the product is unsellable.
    try {
      const stockBySku = new Map(
        (parsed.data.variants || []).map((v) => [v.sku.toUpperCase(), v.stock] as const)
      );
      await InventoryService.syncFromProduct({
        productId: String(product._id),
        baseSKU: product.baseSKU,
        hasVariants: useVariants,
        variants: (product.variants || []).map((v: { sku: string }) => ({
          sku: String(v.sku),
          stock: stockBySku.get(String(v.sku).toUpperCase()),
        })),
        initialStock: parsed.data.initialStock,
      });
    } catch (invErr) {
      // Product exists; missing inventory heals on next save/backfill — don't fail create.
      logger.error("Inventory sync failed after product create", "product", { productId: String(product._id), error: String(invErr) });
    }

    logger.info("Product created", "product", { productId: product._id });
    try {
      const { AuditLog } = await import("@/models/AuditLog");
      await AuditLog.create({ admin: session.userId as any, action: "PRODUCT_CREATED", entity: "Product", entityId: String(product._id), timestamp: new Date() });
    } catch { /* best-effort */ }
    return NextResponse.json(successResponse(product), { status: 201 });
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Create product error", "product", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create product"), { status: 500 });
  }
}
