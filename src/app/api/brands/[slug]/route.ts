import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/Brand";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { brandUpdateSchema } from "@/validators/catalog";

async function findBrand(slugOrId: string) {
  await connectDB();
  return (
    (await Brand.findOne({ slug: slugOrId })) ||
    (/^[0-9a-fA-F]{24}$/.test(slugOrId) ? await Brand.findById(slugOrId) : null)
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const brand = await findBrand(slug);
    if (!brand) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Brand not found"), { status: 404 });
    }
    return NextResponse.json(successResponse(brand));
  } catch (error) {
    logger.error("Get brand error", "brand", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch brand"), { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    await requirePermission("brands.write");
    const { slug } = await params;
    const body = await request.json().catch(() => null);
    const parsed = brandUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid brand data"),
        { status: 400 }
      );
    }
    const { name, logo, description, isActive } = parsed.data;

    const brand: any = await findBrand(slug);
    if (!brand) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Brand not found"), { status: 404 });
    }

    if (name && name.trim()) {
      const newSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const existing = await Brand.findOne({ slug: newSlug, _id: { $ne: brand._id } });
      if (existing) {
        return NextResponse.json(errorResponse("CONFLICT", "Brand with this name already exists"), { status: 409 });
      }
      brand.name = name.trim();
      brand.slug = newSlug;
    }

    if (logo !== undefined) brand.logo = logo;
    if (description !== undefined) brand.description = description;
    if (isActive !== undefined) brand.isActive = isActive;

    await brand.save();

    return NextResponse.json(successResponse(brand));
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Update brand error", "brand", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update brand"), { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    await requirePermission("brands.delete");
    const { slug } = await params;
    const brand: any = await findBrand(slug);
    if (!brand) {
      return NextResponse.json(errorResponse("NOT_FOUND", "Brand not found"), { status: 404 });
    }
    await Brand.deleteOne({ _id: brand._id });

    return NextResponse.json(successResponse({ message: "Brand deleted successfully" }));
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Delete brand error", "brand", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to delete brand"), { status: 500 });
  }
}
