import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/public-settings";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const settings = await getPublicSettings();
    return NextResponse.json(successResponse(settings));
  } catch {
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load settings"), { status: 500 });
  }
}
