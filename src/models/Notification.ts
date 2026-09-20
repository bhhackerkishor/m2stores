import mongoose, { Schema, Types } from "mongoose";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS";
export type NotificationEvent =
  | "ORDER_CONFIRMED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "ORDER_PACKED"
  | "ORDER_SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "ORDER_CANCELLED"
  | "RETURN_UPDATE"
  | "REFUND_COMPLETED"
  | "SUPPORT_REPLY";

export interface INotification {
  userId: Types.ObjectId;
  event: NotificationEvent;
  title: string;
  body: string;
  link?: string;
  orderNumber?: string;
  channels: NotificationChannel[];
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    link: { type: String },
    orderNumber: { type: String, index: true },
    channels: { type: [String], default: ["IN_APP"] },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification =
  (mongoose.models.Notification as mongoose.Model<INotification> | undefined) ||
  mongoose.model<INotification>("Notification", NotificationSchema);
