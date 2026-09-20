import mongoose, { Schema, Document, Types } from "mongoose";

export type SectionType = "BANNER" | "CATEGORY_GRID" | "PRODUCT_GRID" | "PROMO_STRIP" | "BRAND_LOGO" | "FEATURED_SECTION";

export interface IHomepageSection {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  image?: { url: string; publicId: string };
  link?: string;
  productIds?: Types.ObjectId[];
  categoryIds?: Types.ObjectId[];
  bannerIds?: string[];
  ordering: number;
  isActive: boolean;
  config?: Record<string, unknown>;
}

export interface IHomepageConfig {
  sections: IHomepageSection[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HomepageConfigSchema = new Schema<IHomepageConfig>(
  {
    sections: [
      {
        id: { type: String, required: true },
        type: { type: String, enum: ["BANNER", "CATEGORY_GRID", "PRODUCT_GRID", "PROMO_STRIP", "BRAND_LOGO", "FEATURED_SECTION"], required: true },
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        image: { type: { url: String, publicId: String } },
        link: { type: String },
        productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
        bannerIds: [String],
        ordering: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        config: { type: Schema.Types.Mixed },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const HomepageConfig =
  (mongoose.models.HomepageConfig as mongoose.Model<IHomepageConfig> | undefined) ||
  mongoose.model<IHomepageConfig>("HomepageConfig", HomepageConfigSchema);
