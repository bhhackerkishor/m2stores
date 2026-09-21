import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Setting } from "@/models/Setting";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { AuditLog } from "@/models/AuditLog";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const schema = z.object({
  storeName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  contactAddress: z.string().max(500).optional(),
  currency: z.string().max(10).optional(),
  currencySymbol: z.string().max(5).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  gstIn: z.string().max(15).optional(),
  businessName: z.string().max(200).optional(),
  businessAddress: z.string().max(500).optional(),
  businessState: z.string().max(100).optional(),
  businessStateCode: z.string().max(2).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(30).optional(),
  bankIFSC: z.string().max(11).optional(),
  bankBranch: z.string().max(100).optional(),
  shippingFlatRate: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  freeShippingEnabled: z.boolean().optional(),
  expressFee: z.number().min(0).optional(),
  isCODEnabled: z.boolean().optional(),
  codMinOrderValue: z.number().min(0).optional(),
  codMaxOrderValue: z.number().min(0).optional(),
  codFee: z.number().min(0).optional(),
  codAllowedPincodes: z.array(z.string().regex(/^\d{6}$/)).max(500).optional(),
  codDaysCal: z.number().min(1).max(30).optional(),
  returnWindowDays: z.number().min(0).max(90).optional(),
  phonePeMerchantId: z.string().max(100).optional(),
  phonePeSaltIndex: z.number().min(0).optional(),
  phonePeEnvironment: z.enum(["SANDBOX", "PRODUCTION"]).optional(),
  phonePeHostUrl: z.string().url().optional(),
  notificationEmailEnabled: z.boolean().optional(),
  notificationSMSEnabled: z.boolean().optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(300).optional(),
}).strict();

function mask(settings: any) {
  const s = { ...(settings || {}) };
  delete s.phonePeSaltKey;
  return s;
}

export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "settings.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Settings permission required"), { status: 403 });
    }
    await connectDB();
    const s: any = await Setting.findOne().lean();
    return NextResponse.json(successResponse(mask(s || {})));
  } catch (error: any) {
    logger.error("Get settings error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to load settings"), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "settings.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Settings write permission required"), { status: 403 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid settings"), { status: 400 });
    }
    await connectDB();
    const before: any = await Setting.findOne().lean();
    const updated: any = await Setting.findOneAndUpdate({}, { $set: parsed.data }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    try {
      await AuditLog.create({ admin: session.userId as any, action: "SETTING_CHANGED", entity: "Setting", entityId: "global", oldValue: mask(before) as any, newValue: mask(updated) as any, timestamp: new Date() });
    } catch { /* best-effort */ }
    return NextResponse.json(successResponse(mask(updated)));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Save settings error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to save settings"), { status: 500 });
  }
}
