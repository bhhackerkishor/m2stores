import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { InventoryService } from "@/services/inventory.service";
import { adjustSchema } from "@/validators/inventory";
import { AuditLog } from "@/models/AuditLog";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const { requirePermission } = await import("@/lib/auth-server");
    const session = await requirePermission("inventory.adjust");

    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", parsed.error.flatten()), { status: 400 });
    }

    // performedBy must be a User ObjectId — never trust client-provided labels like "admin".
    const performedBy = mongoose.isValidObjectId(session.userId) ? String(session.userId) : undefined;

    const result = await InventoryService.adjust({ ...parsed.data, performedBy });

    // Audit every manual adjustment
    try {
      await connectDB();
      if (performedBy) {
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
      }
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
