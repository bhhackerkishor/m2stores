import mongoose, { Schema, Types } from "mongoose";

export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "RECEIVED" | "REFUNDED";
export type PickupStatus = "PENDING" | "SCHEDULED" | "PICKED_UP" | "RECEIVED";
export type RefundStatus = "NONE" | "REQUESTED" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface IReturnItem {
  productId: Types.ObjectId;
  sku: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface IReturnRequest {
  rmaNumber: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  items: IReturnItem[];
  reason: string;
  status: ReturnStatus;
  pickupStatus: PickupStatus;
  pickupAddress?: string;
  refund: {
    status: RefundStatus;
    amount: number;
    refundId?: string;
    initiatedAt?: Date;
    completedAt?: Date;
    failureReason?: string;
  };
  adminNotes?: string;
  requestedAt: Date;
  resolvedAt?: Date;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    rmaNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        sku: { type: String, required: true, uppercase: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        refundAmount: { type: Number, required: true, min: 0 },
      },
    ],
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "RECEIVED", "REFUNDED"],
      default: "REQUESTED",
      index: true,
    },
    pickupStatus: {
      type: String,
      enum: ["PENDING", "SCHEDULED", "PICKED_UP", "RECEIVED"],
      default: "PENDING",
    },
    pickupAddress: { type: String, trim: true, maxlength: 500 },
    refund: {
      status: { type: String, enum: ["NONE", "REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "FAILED"], default: "NONE" },
      amount: { type: Number, default: 0, min: 0 },
      refundId: { type: String },
      initiatedAt: { type: Date },
      completedAt: { type: Date },
      failureReason: { type: String },
    },
    adminNotes: { type: String, trim: true, maxlength: 2000 },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

ReturnRequestSchema.index({ orderId: 1, status: 1 });
ReturnRequestSchema.index({ userId: 1, createdAt: -1 });

export const ReturnRequest =
  (mongoose.models.ReturnRequest as mongoose.Model<IReturnRequest> | undefined) ||
  mongoose.model<IReturnRequest>("ReturnRequest", ReturnRequestSchema);
