import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProductVariant {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  salePrice?: number;
  images?: string[];
  isActive: boolean;
}

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
}

export interface IProductSpecification {
  group: string;
  key: string;
  value: string;
}

export interface IProductSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage?: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: Types.ObjectId;
  subcategoryId?: Types.ObjectId;
  brandId?: Types.ObjectId;
  images: IProductImage[];
  basePrice: number;
  salePrice?: number;
  costPrice?: number;
  taxRate: number;
  hasVariants: boolean;
  baseSKU?: string;
  variants: IProductVariant[];
  specifications: IProductSpecification[];
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  warranty?: string;
  returnPolicyDays?: number;
  tags: string[];
  seo: IProductSEO;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, trim: true, maxlength: 300 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    subcategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    basePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    hasVariants: { type: Boolean, default: false },
    baseSKU: { type: String, index: true },
    variants: [
      {
        sku: { type: String, required: true, trim: true, uppercase: true },
        attributes: { type: Schema.Types.Mixed, default: {} },
        price: { type: Number, required: true, min: 0 },
        salePrice: { type: Number, min: 0 },
        images: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
      },
    ],
    specifications: [
      {
        group: { type: String, required: true },
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    warranty: { type: String, trim: true },
    returnPolicyDays: { type: Number, default: 7, min: 0 },
    tags: { type: [String], default: [] },
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      keywords: { type: [String], default: [] },
      ogImage: { type: String },
    },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ tags: 1, status: 1 });
ProductSchema.index({ "variants.sku": 1 });

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
