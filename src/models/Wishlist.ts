import mongoose, { Schema, Types } from "mongoose";

export interface IWishlistItem {
  productId: Types.ObjectId;
  sku: string;
  addedAt: Date;
}

export interface IWishlist {
  userId?: Types.ObjectId;
  guestSessionId?: string;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    guestSessionId: { type: String },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        sku: { type: String, required: true, trim: true, uppercase: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Partial unique indexes — never index missing/null (see Cart.ts).
WishlistSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } });
WishlistSchema.index({ guestSessionId: 1 }, { unique: true, partialFilterExpression: { guestSessionId: { $type: "string" } } });

export const Wishlist =
  (mongoose.models.Wishlist as mongoose.Model<IWishlist> | undefined) ||
  mongoose.model<IWishlist>("Wishlist", WishlistSchema);
