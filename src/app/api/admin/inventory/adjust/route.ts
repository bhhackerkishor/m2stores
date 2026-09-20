import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { adjustSchema } from "@/validators/inventory";
import { AuditLog } from "@/models/AuditLog";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

// NOTE: RBAC check should verify admin session via getSessionFromCookie + hasPermission(inventory.adjust).
// Kept as service-level route; middleware already gates /api/admin/* paths in production setup.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }
    const performedBy = (body.performedBy as string) || "system";
    const result = await InventoryService.adjust({ ...parsed.data, performedBy });

    // Audit every manual adjustment
    try {
      await connectDB();
      await AuditLog.create({
        admin: performedBy as any,
        action: "INVENTORY_ADJUSTED",
        entity: "InventoryState",
        entityId: `${parsed.data.productId}:${parsed.data.sku}`,
        newValue: { delta: parsed.data.delta, reason: parsed.data.reason } as any,
        ip: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
    } catch (auditErr) {
      logger.warn("Audit log failed for inventory adjust", "inventory", { auditErr: String(auditErr) });
    }

    return NextResponse.json(successResponse(result));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    }
    logger.error("Adjust API error", "inventory", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to adjust inventory"), { status: 500 });
  }
}
