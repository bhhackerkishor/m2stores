import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Banner } from "@/models/Banner";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { createBannerSchema, updateBannerSchema } from "@/validators/marketing";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "banners.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Banners permission required"), { status: 403 });
    }
    await connectDB();
    return NextResponse.json(successResponse(await Banner.find().sort({ ordering: 1, createdAt: -1 }).lean()));
  } catch (error: any) {
    logger.error("List banners error", "banner", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to list banners"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "banners.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Banners write permission required"), { status: 403 });
    }
    const body = await request.json();
    const parsed = createBannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid banner", parsed.error.flatten()), { status: 400 });
    }
    await connectDB();
    const norm: any = { ...parsed.data };
    if (norm.startDate) norm.startDate = new Date(norm.startDate);
    if (norm.expiryDate) norm.expiryDate = new Date(norm.expiryDate);
    const created = await Banner.create(norm);
    return NextResponse.json(successResponse(created.toObject()), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Create banner error", "banner", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to create banner"), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "banners.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Banners write permission required"), { status: 403 });
    }
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json(errorResponse("VALIDATION_ERROR", "id is required"), { status: 400 });
    const { updateBannerSchema } = await import("@/validators/marketing");
    const parsed = updateBannerSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid banner"), { status: 400 });
    }
    await connectDB();
    const norm: any = { ...parsed.data };
    if (norm.startDate) norm.startDate = new Date(norm.startDate);
    if (norm.expiryDate) norm.expiryDate = new Date(norm.expiryDate);
    const updated: any = await Banner.findByIdAndUpdate(id, { $set: norm }, { new: true }).lean();
    if (!updated) return NextResponse.json(errorResponse("NOT_FOUND", "Banner not found"), { status: 404 });
    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    logger.error("Update banner error", "banner", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to update banner"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "banners.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Banners write permission required"), { status: 403 });
    }
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json(errorResponse("VALIDATION_ERROR", "id is required"), { status: 400 });
    await connectDB();
    const deleted = await Banner.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json(errorResponse("NOT_FOUND", "Banner not found"), { status: 404 });
    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error: any) {
    logger.error("Delete banner error", "banner", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to delete banner"), { status: 500 });
  }
}
