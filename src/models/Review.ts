import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  title: string;
  review: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  votedUsers: Types.ObjectId[];
  status: "PENDING" | "APPROVED" | "HIDDEN" | "DELETED";
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    review: { type: String, required: true, maxlength: 5000 },
    images: { type: [String], default: [] },
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
    votedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["PENDING", "APPROVED", "HIDDEN", "DELETED"], default: "PENDING", index: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
ReviewSchema.index({ createdAt: -1 });

export const Review =
  (mongoose.models.Review as mongoose.Model<IReview> | undefined) ||
  mongoose.model<IReview>("Review", ReviewSchema);
