import mongoose, { Schema, Document, Types } from "mongoose";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory = "ORDER_ISSUE" | "PAYMENT_ISSUE" | "PRODUCT_QUALITY" | "SHIPPING_ISSUE" | "RETURNS" | "OTHER";

export interface ISupportMessage {
  sender: "CUSTOMER" | "ADMIN";
  senderId: Types.ObjectId;
  content: string;
  attachments?: string[];
  timestamp: Date;
}

export interface ISupportTicket {
  ticketNumber: string;
  user: Types.ObjectId;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages: ISupportMessage[];
  attachments: string[];
  orderId?: Types.ObjectId;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: ["ORDER_ISSUE", "PAYMENT_ISSUE", "PRODUCT_QUALITY", "SHIPPING_ISSUE", "RETURNS", "OTHER"], required: true, index: true },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM", index: true },
    status: { type: String, enum: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"], default: "OPEN", index: true },
    messages: [
      {
        sender: { type: String, enum: ["CUSTOMER", "ADMIN"], required: true },
        senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true, maxlength: 10000 },
        attachments: { type: [String], default: [] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    attachments: { type: [String], default: [] },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ user: 1, status: 1 });
SupportTicketSchema.index({ status: 1, priority: 1 });
SupportTicketSchema.index({ createdAt: -1 });

export const SupportTicket =
  (mongoose.models.SupportTicket as mongoose.Model<ISupportTicket> | undefined) ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
