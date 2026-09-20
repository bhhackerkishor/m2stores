import mongoose, { Schema, Document, Types } from "mongoose";

export type BannerType = "HERO" | "PROMOTIONAL" | "CATEGORY" | "PRODUCT_COLLECTION" | "CAMPAIGN";

export interface IBanner {
  title: string;
  subtitle?: string;
  type: BannerType;
  image: { url: string; publicId: string };
  link?: string;
  linkType?: "PRODUCT" | "CATEGORY" | "PAGE" | "URL";
  linkTarget?: string;
  ordering: number;
  isActive: boolean;
  startDate?: Date;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subtitle: { type: String, trim: true, maxlength: 300 },
    type: { type: String, enum: ["HERO", "PROMOTIONAL", "CATEGORY", "PRODUCT_COLLECTION", "CAMPAIGN"], required: true, index: true },
    image: { url: { type: String, required: true }, publicId: { type: String, required: true } },
    link: { type: String },
    linkType: { type: String, enum: ["PRODUCT", "CATEGORY", "PAGE", "URL"] },
    linkTarget: { type: String },
    ordering: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    startDate: { type: Date },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

BannerSchema.index({ type: 1, isActive: 1 });
BannerSchema.index({ ordering: 1 });
BannerSchema.index({ isActive: 1, type: 1, ordering: 1, startDate: 1, expiryDate: 1 });

export const Banner =
  (mongoose.models.Banner as mongoose.Model<IBanner> | undefined) ||
  mongoose.model<IBanner>("Banner", BannerSchema);
