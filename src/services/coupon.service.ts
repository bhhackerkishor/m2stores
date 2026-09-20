import { connectDB } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { AuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

function normalize(data: any) {
  const out: any = { ...data };
  if (out.code) out.code = String(out.code).toUpperCase().trim();
  if (out.startDate) out.startDate = new Date(out.startDate);
  if (out.expiryDate) out.expiryDate = new Date(out.expiryDate);
  return out;
}

export class CouponService {
  static async list() {
    await connectDB();
    return Coupon.find().sort({ createdAt: -1 }).lean();
  }

  static async create(data: any, adminId?: string) {
    await connectDB();
    const body = normalize(data);
    const existing = await Coupon.findOne({ code: body.code }).lean() as any;
    if (existing) throw new AppError("Coupon with this code already exists", 409, "CONFLICT");
    const coupon = await Coupon.create(body);
    try {
      if (adminId) {
        await AuditLog.create({ admin: adminId as any, action: "COUPON_CREATED", entity: "Coupon", entityId: coupon.code, newValue: { code: coupon.code } as any, timestamp: new Date() });
      }
    } catch { /* best-effort */ }
    logger.info("Coupon created", "coupon", { code: coupon.code });
    return coupon.toObject();
  }

  static async update(code: string, data: any, adminId?: string) {
    await connectDB();
    const body = normalize(data);
    delete body.code;
    const coupon: any = await Coupon.findOneAndUpdate({ code: code.toUpperCase() }, { $set: body }, { new: true });
    if (!coupon) throw new AppError("Coupon not found", 404, "NOT_FOUND");
    try {
      if (adminId) {
        await AuditLog.create({ admin: adminId as any, action: "COUPON_UPDATED", entity: "Coupon", entityId: code, newValue: body as any, timestamp: new Date() });
      }
    } catch { /* best-effort */ }
    return coupon.toObject();
  }

  static async remove(code: string, adminId?: string) {
    await connectDB();
    const coupon = await Coupon.findOneAndDelete({ code: code.toUpperCase() });
    if (!coupon) throw new AppError("Coupon not found", 404, "NOT_FOUND");
    try {
      if (adminId) {
        await AuditLog.create({ admin: adminId as any, action: "COUPON_DELETED", entity: "Coupon", entityId: code, timestamp: new Date() });
      }
    } catch { /* best-effort */ }
    return { deleted: true };
  }

  /** Public storefront list: active, in-window coupons (no abuse vectors exposed beyond code + value). */
  static async publicList() {
    await connectDB();
    const now = new Date();
    const coupons: any[] = await Coupon.find({ isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now } })
      .select("code discountType discountValue minOrderValue maxDiscountAmount isFirstOrderOnly startDate expiryDate")
      .sort({ createdAt: -1 })
      .lean();
    return coupons;
  }
}
