import mongoose, { Schema, Document, Types } from "mongoose";

export type AuditAction =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_ARCHIVED"
  | "INVENTORY_ADJUSTED"
  | "INVENTORY_RECEIVED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "REFUND_CREATED"
  | "REFUND_PROCESSED"
  | "COUPON_CREATED"
  | "COUPON_UPDATED"
  | "COUPON_DELETED"
  | "OFFER_CREATED"
  | "OFFER_UPDATED"
  | "OFFER_DELETED"
  | "REVIEW_APPROVED"
  | "REVIEW_REJECTED"
  | "REVIEW_DELETED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "CUSTOMER_UPDATED"
  | "ADMIN_CREATED"
  | "ADMIN_UPDATED"
  | "ADMIN_PERMISSION_CHANGED"
  | "SETTING_CHANGED"
  | "SHIPPING_UPDATED"
  | "PAYMENT_REFUNDED"
  | "NOTIFICATION_SENT";

export interface IAuditLog extends Document {
  admin: Types.ObjectId;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ["PRODUCT_CREATED", "PRODUCT_UPDATED", "PRODUCT_DELETED", "PRODUCT_ARCHIVED", "INVENTORY_ADJUSTED", "INVENTORY_RECEIVED", "ORDER_STATUS_CHANGED", "ORDER_CANCELLED", "REFUND_CREATED", "REFUND_PROCESSED", "COUPON_CREATED", "COUPON_UPDATED", "COUPON_DELETED", "OFFER_CREATED", "OFFER_UPDATED", "OFFER_DELETED", "REVIEW_APPROVED", "REVIEW_REJECTED", "REVIEW_DELETED", "RETURN_APPROVED", "RETURN_REJECTED", "CUSTOMER_UPDATED", "ADMIN_CREATED", "ADMIN_UPDATED", "ADMIN_PERMISSION_CHANGED", "SETTING_CHANGED", "SHIPPING_UPDATED", "PAYMENT_REFUNDED", "NOTIFICATION_SENT"], required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

AuditLogSchema.index({ admin: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
