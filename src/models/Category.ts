import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  image?: string;
  parentCategoryId?: Types.ObjectId;
  level: number;
  attributes: Array<{
    name: string;
    type: "TEXT" | "SELECT" | "NUMBER";
    options: string[];
    isFilterable: boolean;
  }>;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, unique: true, required: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String },
    parentCategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    level: { type: Number, default: 0 },
    attributes: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ["TEXT", "SELECT", "NUMBER"], required: true },
        options: { type: [String], default: [] },
        isFilterable: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ parentCategoryId: 1, isActive: 1 });

export const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
