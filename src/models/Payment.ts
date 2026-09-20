import mongoose, { Schema, Document, Types } from "mongoose";
import { PaymentStatus } from "./Order";

export type PaymentProvider = "PHONEPE" | "COD";

export interface IProviderWebhookLog {
  eventType: string;
  rawPayload: Record<string, unknown>;
  signature: string;
  verified: boolean;
  processed: boolean;
  processedAt?: Date;
}

export interface IRefundDetails {
  refundId?: string;
  amount: number;
  status: PaymentStatus;
  initiatedAt?: Date;
  completedAt?: Date;
}

export interface IPayment {
  paymentId: string;
  orderId: Types.ObjectId;
  provider: PaymentProvider;
  merchantTransactionId: string;
  providerTransactionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  rawWebhookLogs: IProviderWebhookLog[];
  refundDetails: IRefundDetails;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    provider: { type: String, enum: ["PHONEPE", "COD"], required: true, index: true },
    merchantTransactionId: { type: String, required: true, unique: true },
    providerTransactionId: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["CREATED", "PENDING", "AUTHORIZED", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"], default: "CREATED", index: true },
    rawWebhookLogs: [
      {
        eventType: { type: String },
        rawPayload: { type: Schema.Types.Mixed },
        signature: { type: String },
        verified: { type: Boolean, default: false },
        processed: { type: Boolean, default: false },
        processedAt: { type: Date },
      },
    ],
    refundDetails: {
      refundId: { type: String },
      amount: { type: Number, min: 0 },
      status: { type: String },
      initiatedAt: { type: Date },
      completedAt: { type: Date },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PaymentSchema.index({ status: 1, createdAt: -1 });

export const Payment =
  (mongoose.models.Payment as mongoose.Model<IPayment> | undefined) ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
