import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInventoryState {
  productId: Types.ObjectId;
  sku: string;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface IInventoryReservation {
  _id: string;
  orderId: Types.ObjectId;
  orderItemId: string;
  productId: Types.ObjectId;
  sku: string;
  quantity: number;
  status: "ACTIVE" | "COMMITTED" | "RELEASED";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryOperation {
  operationId: string;
  orderId: Types.ObjectId;
  reservationId: string;
  productId: Types.ObjectId;
  sku: string;
  operationType: "RESERVE" | "COMMIT" | "RELEASE" | "ADJUST";
  quantity: number;
  previousStock: number;
  newStock: number;
  previousReserved: number;
  newReserved: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  reason: string;
  performedBy?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryStateSchema = new Schema<IInventoryState>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true, index: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    reservedStock: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
);

InventoryStateSchema.index({ productId: 1, sku: 1 }, { unique: true });
InventoryStateSchema.index({ reservedStock: 1 });
InventoryStateSchema.index({ stock: 1 });

const InventoryReservationSchema = new Schema<IInventoryReservation>(
  {
    _id: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderItemId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["ACTIVE", "COMMITTED", "RELEASED"], default: "ACTIVE", index: true },
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true }
);

InventoryReservationSchema.index({ orderId: 1, sku: 1 });
InventoryReservationSchema.index({ status: 1, expiresAt: 1 });

const InventoryOperationSchema = new Schema<IInventoryOperation>(
  {
    operationId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    reservationId: { type: String },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    operationType: { type: String, enum: ["RESERVE", "COMMIT", "RELEASE", "ADJUST"], required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    previousReserved: { type: Number, required: true, min: 0 },
    newReserved: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "PENDING", index: true },
    reason: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

InventoryOperationSchema.index({ orderId: 1, operationType: 1 });
InventoryOperationSchema.index({ reservationId: 1 });

export const InventoryState =
  (mongoose.models.InventoryState as mongoose.Model<IInventoryState> | undefined) ||
  mongoose.model<IInventoryState>("InventoryState", InventoryStateSchema);
export const InventoryReservation =
  (mongoose.models.InventoryReservation as mongoose.Model<IInventoryReservation> | undefined) ||
  mongoose.model<IInventoryReservation>("InventoryReservation", InventoryReservationSchema);
export const InventoryOperation =
  (mongoose.models.InventoryOperation as mongoose.Model<IInventoryOperation> | undefined) ||
  mongoose.model<IInventoryOperation>("InventoryOperation", InventoryOperationSchema);
