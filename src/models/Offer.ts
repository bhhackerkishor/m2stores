import mongoose, { Schema, Types } from "mongoose";

export type OfferType = "PERCENTAGE" | "FREE_SHIPPING" | "BXGY";

export interface IOffer {
  title: string;
  description?: string;
  type: OfferType;
  // PERCENTAGE
  discountValue?: number; // percent
  maxDiscountAmount?: number;
  // BXGY: buy X units of scoped products, get Y cheapest units free
  buyQty?: number;
  getQty?: number;
  applicableCategoryIds: Types.ObjectId[];
  applicableProductIds: Types.ObjectId[];
  applicableBrandIds: Types.ObjectId[];
  minOrderValue: number;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  priority: number; // higher wins ties
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: ["PERCENTAGE", "FREE_SHIPPING", "BXGY"], required: true, index: true },
    discountValue: { type: Number, min: 0, max: 100 },
    maxDiscountAmount: { type: Number, min: 0 },
    buyQty: { type: Number, min: 1 },
    getQty: { type: Number, min: 1 },
    applicableCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    applicableProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableBrandIds: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
    minOrderValue: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OfferSchema.index({ isActive: 1, startDate: 1, expiryDate: 1 });

export const Offer =
  (mongoose.models.Offer as mongoose.Model<IOffer> | undefined) ||
  mongoose.model<IOffer>("Offer", OfferSchema);
