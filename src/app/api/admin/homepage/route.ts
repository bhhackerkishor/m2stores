import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { HomepageConfig } from "@/models/HomepageConfig";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { saveHomepageSchema } from "@/validators/marketing";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "homepage.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Homepage permission required"), { status: 403 });
    }
    await connectDB();
    const cfg: any = await HomepageConfig.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(successResponse(cfg || { sections: [] }));
  } catch (error: any) {
    logger.error("Get homepage error", "cms", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load homepage"), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "homepage.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Homepage write permission required"), { status: 403 });
    }
    const body = await request.json();
    const parsed = saveHomepageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid sections", parsed.error.flatten()), { status: 400 });
    }
    await connectDB();
    const sections = [...parsed.data.sections].sort((a, b) => a.ordering - b.ordering);
    const cfg: any = await HomepageConfig.findOneAndUpdate(
      { isActive: true },
      { $set: { sections, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json(successResponse(cfg));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Save homepage error", "cms", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to save homepage"), { status: 500 });
  }
}
