import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("m2s_token")?.value;

    if (token) {
      // Decode token to get userId for session invalidation
      // In a real app, decode JWT to get userId
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        await invalidateSession(payload.userId);
      }
    }

    cookieStore.delete("m2s_token");

    logger.info("User logged out", "auth");
    return NextResponse.json(successResponse({ message: "Logged out successfully" }));
  } catch (error) {
    logger.error("Logout error", "auth", { error });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Logout failed"), { status: 500 });
  }
}
