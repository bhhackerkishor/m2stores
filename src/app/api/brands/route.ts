import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/Brand";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { brandSchema } from "@/validators/catalog";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("active") !== "false";
    const filter: any = {};
    if (activeOnly) filter.isActive = true;

    const brands = await Brand.find(filter).sort({ name: 1 });
    return NextResponse.json(successResponse(brands));
  } catch (error) {
    logger.error("Get brands error", "brand", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch brands"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    await requirePermission("brands.write");
    const body = await request.json().catch(() => null);
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid brand data"),
        { status: 400 }
      );
    }
    const { name, logo, description } = parsed.data;

    await connectDB();
    const existing = await Brand.findOne({ slug: name.toLowerCase().replace(/\s+/g, "-") });
    if (existing) {
      return NextResponse.json(errorResponse("CONFLICT", "Brand already exists"), { status: 409 });
    }

    const brand = await Brand.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      logo,
      description,
    });

    return NextResponse.json(successResponse(brand), { status: 201 });
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Create brand error", "brand", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create brand"), { status: 500 });
  }
}
