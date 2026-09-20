import mongoose, { Schema, Document, Types } from "mongoose";
import { ROLES } from "../config/permissions";

export interface IUser extends Document {
  name: string;
  email?: string;
  phone: string;
  passwordHash?: string;
  role: (typeof ROLES)[number];
  permissions: string[];
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
  defaultShippingAddressId?: Types.ObjectId;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  otpSentAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;
  sessionVersion: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, lowercase: true, sparse: true, index: true },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLES, default: "CUSTOMER", index: true },
    permissions: { type: [String], default: [] },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    status: { type: String, enum: ["ACTIVE", "BLOCKED", "SUSPENDED"], default: "ACTIVE", index: true },
    defaultShippingAddressId: { type: Schema.Types.ObjectId, ref: "Address" },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
    sessionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ phone: 1, role: 1 });
UserSchema.index({ email: 1, role: 1 });

export const User =
  (mongoose.models.User as mongoose.Model<IUser> | undefined) ||
  mongoose.model<IUser>("User", UserSchema);
