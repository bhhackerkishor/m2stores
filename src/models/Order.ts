import mongoose, { Schema, Document, Types } from "mongoose";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "RETURNED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PAYMENT_RECEIVED";

export type PaymentMethod = "PHONEPE" | "COD";
export type PaymentStatus = "CREATED" | "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export interface IOrderItem {
  productId: Types.ObjectId;
  sku: string;
  nameSnapshot: string;
  imageSnapshot: string;
  attributesSnapshot: Record<string, string>;
  unitPrice: number;
  salePrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  quantity: number;
  finalLineTotal: number;
}

export interface IAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IPricingSnapshot {
  subtotal: number;
  itemsDiscount: number;
  couponDiscount: number;
  couponCode: string;
  offerDiscount: number;
  offerId?: string;
  offerTitle?: string;
  shippingFee: number;
  codFee: number;
  taxTotal: number;
  grandTotal: number;
}

export interface IShippingEvent {
  status: string;
  location?: string;
  city?: string;
  timestamp: Date;
  note?: string;
}

export interface IDeliveryChange {
  previousDate: Date | null;
  newDate: Date;
  reason: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
}

export interface IShippingDetails {
  provider?: string;
  shipmentId?: string;
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  fee?: number;
  estimatedDelivery?: Date;
  currentlyAt?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  events?: IShippingEvent[];
  deliveryChanges?: IDeliveryChange[];
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  updatedBy?: Types.ObjectId;
  notes?: string;
}

export interface IOrderCancellation {
  reason: string;
  cancelledAt: Date;
  cancelledBy: Types.ObjectId;
  refundStatus?: PaymentStatus;
}

export interface IReturnDetails {
  reason: string;
  requestedAt: Date;
  resolvedAt?: Date;
  pickupStatus?: string;
}

export interface IOrder {
  orderNumber: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IAddress;
  billingAddress: IAddress;
  pricingSnapshot: IPricingSnapshot;
  paymentInfo: {
    method: PaymentMethod;
    paymentId?: Types.ObjectId;
    status: PaymentStatus;
  };
  orderStatus: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  shippingDetails: IShippingDetails;
  cancellation?: IOrderCancellation;
  returnDetails?: IReturnDetails;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  sku: { type: String },
  nameSnapshot: { type: String },
  imageSnapshot: { type: String },
  attributesSnapshot: { type: Schema.Types.Mixed },
  unitPrice: { type: Number },
  salePrice: { type: Number },
  taxRate: { type: Number },
  taxAmount: { type: Number },
  discountAmount: { type: Number },
  quantity: { type: Number },
  finalLineTotal: { type: Number },
});

const addressSchema = new Schema({
  fullName: { type: String },
  phone: { type: String },
  addressLine1: { type: String },
  addressLine2: { type: String },
  landmark: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  country: { type: String },
});

const pricingSnapshotSchema = new Schema({
  subtotal: { type: Number },
  itemsDiscount: { type: Number },
  couponDiscount: { type: Number },
  couponCode: { type: String },
  offerDiscount: { type: Number, default: 0 },
  offerId: { type: String },
  offerTitle: { type: String },
  shippingFee: { type: Number },
  codFee: { type: Number },
  taxTotal: { type: Number },
  grandTotal: { type: Number },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: true },
    pricingSnapshot: { type: pricingSnapshotSchema, required: true },
    paymentInfo: {
      method: { type: String, enum: ["PHONEPE", "COD"], required: true },
      paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
      status: { type: String, enum: ["CREATED", "PENDING", "AUTHORIZED", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"], default: "CREATED", index: true },
    },
    orderStatus: { type: String, enum: ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RETURNED", "REFUND_PENDING", "REFUNDED", "PAYMENT_RECEIVED"], default: "PENDING_PAYMENT", index: true },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
        notes: { type: String, trim: true },
      },
    ],
    shippingDetails: {
      provider: { type: String },
      shipmentId: { type: String },
      courier: { type: String },
      trackingNumber: { type: String },
      trackingUrl: { type: String },
      fee: { type: Number },
      estimatedDelivery: { type: Date },
      currentlyAt: { type: String },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
      events: [
        {
          status: { type: String },
          location: { type: String },
          city: { type: String },
          timestamp: { type: Date, default: Date.now },
          note: { type: String },
        },
      ],
      deliveryChanges: [
        {
          previousDate: { type: Date },
          newDate: { type: Date },
          reason: { type: String },
          changedBy: { type: Schema.Types.ObjectId, ref: "User" },
          changedAt: { type: Date, default: Date.now },
        },
      ],
    },
    cancellation: {
      reason: { type: String, trim: true },
      cancelledAt: { type: Date },
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
      refundStatus: { type: String },
    },
    returnDetails: {
      reason: { type: String, trim: true },
      requestedAt: { type: Date },
      resolvedAt: { type: Date },
      pickupStatus: { type: String },
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order =
  (mongoose.models.Order as mongoose.Model<IOrder> | undefined) ||
  mongoose.model<IOrder>("Order", OrderSchema);
