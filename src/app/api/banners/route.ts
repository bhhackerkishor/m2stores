import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Banner } from "@/models/Banner";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const type = new URL(request.url).searchParams.get("type") || "HERO";
    const now = new Date();
    const filter: any = {
      isActive: true,
      type,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ expiryDate: { $exists: false } }, { expiryDate: { $gte: now } }] },
      ],
    };
    const banners = await Banner.find(filter).sort({ ordering: 1 }).limit(10).lean();
    const response = NextResponse.json(successResponse(banners));
    response.headers.set("Cache-Control", "public, s-maxage=300, max-age=60, stale-while-revalidate=600");
    return response;
  } catch {
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load banners"), { status: 500 });
  }
}
