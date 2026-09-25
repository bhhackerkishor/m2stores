import { releaseExpiredSchema } from "@/validators/route-guards";
import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";


/**
 * Release expired ACTIVE reservations. Intended for cron (e.g. Vercel Cron).
 * Protect with CRON_SECRET in production: Authorization: Bearer <secret>.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json(errorResponse("UNAUTHORIZED", "Invalid cron secret"), { status: 401 });
      }
    }
    const body = await request.json().catch(() => null);
    const parsed = releaseExpiredSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Invalid release payload"), { status: 400 });
    }
    const result = await InventoryService.releaseExpired(parsed.data.limit ?? 100);
    return NextResponse.json(successResponse(result));
  } catch (error) {
    logger.error("Release-expired error", "inventory", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to release expired reservations"), { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await InventoryService.assertInvariants();
    return NextResponse.json(successResponse(result));
  } catch (error) {
    logger.error("Invariant check error", "inventory", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to check invariants"), { status: 500 });
  }
}
