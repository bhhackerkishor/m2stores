import mongoose, { Schema, Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  sku: string;
  quantity: number;
  addedAt: Date;
}

export interface ICart {
  userId?: Types.ObjectId;
  guestSessionId?: string;
  items: ICartItem[];
  appliedCouponCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", sparse: true, unique: true },
    guestSessionId: { type: String, sparse: true, unique: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        sku: { type: String, required: true, trim: true, uppercase: true },
        quantity: { type: Number, required: true, min: 1, max: 10 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    appliedCouponCode: { type: String, default: "", uppercase: true, trim: true },
  },
  { timestamps: true }
);

export const Cart =
  (mongoose.models.Cart as mongoose.Model<ICart> | undefined) || mongoose.model<ICart>("Cart", CartSchema);
