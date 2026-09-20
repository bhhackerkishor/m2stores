import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
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
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid product data"),
        { status: 400 }
      );
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Product not found"), { status: 404 });
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
    return NextResponse.json(
      errorResponse("UPDATE_FAILED", error.message || "Failed to update product"),
      { status: 400 }
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
