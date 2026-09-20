import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { logger } from "@/lib/logger";

// Cron endpoint to release expired inventory reservations.
// Protect with CRON_SECRET header. Schedule via Vercel Cron or external cron job.
// Vercel Cron: add to vercel.json - { "crons": [{ "path": "/api/cron/inventory-expire", "schedule": "*/5 * * * *" }] }
// External: curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/inventory-expire

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await InventoryService.releaseExpired(200);
    logger.info("Cron: expired reservations released", "cron", result);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    logger.error("Cron: failed to release expired reservations", "cron", { error: String(error?.message || error) });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
