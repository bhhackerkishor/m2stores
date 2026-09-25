import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { categoryUpdateSchema } from "@/validators/catalog";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB();
    const { slug } = await params;
    const category = await Category.findOne({ slug }).populate("parentCategoryId");
    if (!category) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Category not found"), { status: 404 });
    }
    return NextResponse.json(successResponse(category));
  } catch (error) {
    logger.error("Get category by slug error", "category", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch category"), { status: 500 });
  }
}
// Helper function to recursively update levels of all child categories
async function updateChildLevels(parentId: string, parentLevel: number) {
  const children = await Category.find({ parentCategoryId: parentId });
  for (const child of children) {
    const newChildLevel = parentLevel + 1;
    child.level = newChildLevel;
    await child.save();
    // Cascade down to deeper nesting levels
    await updateChildLevels(child._id.toString(), newChildLevel);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    await requirePermission("categories.write");
    const body = await request.json().catch(() => null);
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid category data"),
        { status: 400 }
      );
    }
    await connectDB();
    const { slug } = await params;

    const existingCategory = await Category.findOne({ slug });
    if (!existingCategory) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Category not found"), { status: 404 });
    }

    // Determine new parent ID (explicit parsed field only — raw body is never spread)
    const newParentId =
      parsed.data.parentCategoryId !== undefined ? parsed.data.parentCategoryId || null : existingCategory.parentCategoryId;

    // Prevent category from being its own parent
    if (newParentId && newParentId.toString() === existingCategory._id.toString()) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Category cannot be its own parent"), { status: 400 });
    }

    // Calculate level based on new parent
    let newLevel = 0;
    if (newParentId) {
      const parent = await Category.findById(newParentId);
      if (!parent) {
        return NextResponse.json(errorResponse("NOT_FOUND", "Parent category not found"), { status: 404 });
      }
      newLevel = (parent.level ?? 0) + 1;
    }

    // Prepare update object from Zod-parsed fields only (unknown keys stripped)
    const updateData: Record<string, unknown> = {};
    for (const key of ["name", "slug", "description", "image", "attributes", "sortOrder", "isActive"] as const) {
      if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key];
    }
    if (updateData.slug) updateData.slug = String(updateData.slug).toLowerCase();
    updateData.parentCategoryId = newParentId;
    updateData.level = newLevel;

    const category = await Category.findByIdAndUpdate(existingCategory._id, updateData, { new: true });

    // If level changed, recursively update all descendant categories
    if (existingCategory.level !== newLevel) {
      await updateChildLevels(category._id.toString(), newLevel);
    }

    logger.info("Category updated", "category", { categoryId: category._id });
    return NextResponse.json(successResponse(category));
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Update category error", "category", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update category"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    await requirePermission("categories.delete");
    await connectDB();
    const { slug } = await params;
    const category = await Category.findOneAndDelete({ slug });
    if (!category) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Category not found"), { status: 404 });
    }

    logger.info("Category deleted", "category", { categoryId: category._id });
    return NextResponse.json(successResponse({ message: "Category deleted" }));
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Delete category error", "category", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to delete category"), { status: 500 });
  }
}
