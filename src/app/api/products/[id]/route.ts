import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { InventoryService } from "@/services/inventory.service";
import { updateProductSchema } from "@/validators/product";
import { successResponse, errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// GET product by ID or Slug (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    // Ensure populate targets are registered in this route bundle
    void Brand.modelName;
    void Category.modelName;
    const { id } = await params;

    // Search by ObjectId or fallback to Slug match
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const product = isObjectId
      ? await Product.findById(id).populate("categoryId brandId subcategoryId")
      : await Product.findOne({ slug: id.toLowerCase() }).populate("categoryId brandId subcategoryId");

    if (!product) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Product not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(product));
  } catch (error) {
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch product"), { status: 500 });
  }
}

// PUT / UPDATE product by ID (admin only, validated)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    const session = await requirePermission("products.write");
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    // Defensive: normalize cleared refs (client may send null) before validation.
    for (const k of ["categoryId", "subcategoryId", "brandId"] as const) {
      if (body?.[k] === null || body?.[k] === "") body[k] = undefined;
    }
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const where = first?.path?.length ? `${first.path.join(".")}: ` : "";
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", `${where}${first?.message || "Invalid product data"}`, parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Only apply keys the client actually sent — never let schema defaults
    // (status, taxRate, images, ...) clobber stored values on partial updates.
    // Inventory-only fields are stripped — stock lives only in InventoryState.
    const update: Record<string, unknown> = {};
    for (const k of Object.keys(body)) {
      if (k === "initialStock") continue;
      if (k in parsed.data) update[k] = (parsed.data as Record<string, unknown>)[k];
    }
    if (Array.isArray(update.variants)) {
      update.variants = (update.variants as any[]).map(({ stock: _s, ...rest }) => rest);
    }
    const updatedProduct = await Product.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Product not found"), { status: 404 });
    }

    // Ensure inventory rows for current SKUs; apply stock only when the client sent it.
    try {
      const bodyInitial = typeof body.initialStock === "number" ? body.initialStock : undefined;
      const stockBySku = new Map<string, number>();
      if (Array.isArray(body.variants)) {
        for (const v of body.variants) {
          if (v?.sku && typeof v.stock === "number") stockBySku.set(String(v.sku).toUpperCase(), v.stock);
        }
      }
      const useVariants = updatedProduct.hasVariants && (updatedProduct.variants?.length || 0) > 0;
      if (!useVariants && !updatedProduct.baseSKU) {
        updatedProduct.baseSKU = `SKU-${String(updatedProduct._id).slice(0, 8).toUpperCase()}`;
        await updatedProduct.save();
      }
      await InventoryService.syncFromProduct({
        productId: String(updatedProduct._id),
        baseSKU: updatedProduct.baseSKU,
        hasVariants: useVariants,
        variants: (updatedProduct.variants || []).map((v: any) => ({
          sku: String(v.sku),
          stock: stockBySku.get(String(v.sku).toUpperCase()),
        })),
        initialStock: bodyInitial,
      });
    } catch (invErr) {
      logger.error("Inventory sync failed after product update", "product", { productId: id, error: String(invErr) });
    }

    try {
      const { AuditLog } = await import("@/models/AuditLog");
      await AuditLog.create({ admin: session.userId as any, action: "PRODUCT_UPDATED", entity: "Product", entityId: String(updatedProduct._id), timestamp: new Date() });
    } catch { /* best-effort */ }

    return NextResponse.json(successResponse(updatedProduct));
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    // Never echo driver/schema internals — log them, return a generic footprint.
    logger.error("Product update failed", "product", { error: String(error?.message || error) });
    const isValidationError = error?.name === "ValidationError" || error?.name === "CastError" || error?.code === 11000;
    return NextResponse.json(
      errorResponse(isValidationError ? "VALIDATION_ERROR" : "UPDATE_FAILED", isValidationError ? "Invalid product data" : "Failed to update product"),
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// DELETE product by ID (admin only) — soft archive to preserve order history
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    const session = await requirePermission("products.delete");
    await connectDB();
    const { id } = await params;

    const product: any = await Product.findById(id);
    if (!product) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Product not found"), { status: 404 });
    }
    product.status = "ARCHIVED";
    await product.save();

    try {
      const { AuditLog } = await import("@/models/AuditLog");
      await AuditLog.create({ admin: session.userId as any, action: "PRODUCT_ARCHIVED", entity: "Product", entityId: String(product._id), timestamp: new Date() });
    } catch { /* best-effort */ }
    logger.info("Product archived", "product", { productId: String(product._id) });

    return NextResponse.json(successResponse({ message: "Product archived" }));
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to archive product"), { status: 500 });
  }
}
