import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, paginatedResponse } from "@/lib/api-response";
import { categorySchema, categoryListQuerySchema } from "@/validators/catalog";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = categoryListQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Invalid query parameters"), { status: 400 });
    }
    const { parentId } = parsedQuery.data;
    const activeOnly = request.nextUrl.searchParams.get("active") !== "false";

    const filter: any = {};
    if (parentId) filter.parentCategoryId = parentId;
    if (activeOnly) filter.isActive = true;

    const categories = await Category.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    const response = NextResponse.json(successResponse(categories));
    response.headers.set("Cache-Control", "public, s-maxage=600, max-age=120, stale-while-revalidate=3600");
    return response;
  } catch (error) {
    logger.error("Get categories error", "category", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch categories"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    await requirePermission("categories.write");
    const body = await request.json().catch(() => null);
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid category data"),
        { status: 400 }
      );
    }
    const { name, slug, description, image, parentCategoryId, attributes, sortOrder, isActive } = parsed.data;

    await connectDB();

    const existing = await Category.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return NextResponse.json(errorResponse("CONFLICT", "Category with this slug already exists"), { status: 409 });
    }

    const level = parentCategoryId ? 1 : 0;
    const category = await Category.create({
      name,
      slug: slug.toLowerCase(),
      description,
      image,
      parentCategoryId: parentCategoryId || undefined,
      level,
      attributes: attributes || [],
      sortOrder: sortOrder || 0,
      ...(isActive !== undefined ? { isActive } : {}),
    });

    logger.info("Category created", "category", { categoryId: category._id });
    return NextResponse.json(successResponse(category), { status: 201 });
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Create category error", "category", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create category"), { status: 500 });
  }
}

