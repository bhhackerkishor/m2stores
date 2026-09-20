import mongoose, { Schema, Document, Types } from "mongoose";

export type DiscountType = "PERCENTAGE" | "FIXED";

export interface ICoupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  applicableCategoryIds: Types.ObjectId[];
  applicableProductIds: Types.ObjectId[];
  applicableBrandIds: Types.ObjectId[];
  isFirstOrderOnly: boolean;
  allowedUserIds: Types.ObjectId[];
  usageLimitTotal: number;
  usageCount: number;
  perUserLimit: number;
  perUserUsageCount: Record<string, number>;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["PERCENTAGE", "FIXED"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    applicableCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    applicableProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableBrandIds: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
    isFirstOrderOnly: { type: Boolean, default: false },
    allowedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    usageLimitTotal: { type: Number, default: Infinity, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    perUserUsageCount: { type: Schema.Types.Mixed, default: {} },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CouponSchema.index({ expiryDate: 1, isActive: 1 });
CouponSchema.index({ applicableCategoryIds: 1 });
CouponSchema.index({ applicableProductIds: 1 });

export const Coupon =
  (mongoose.models.Coupon as mongoose.Model<ICoupon> | undefined) ||
  mongoose.model<ICoupon>("Coupon", CouponSchema);
