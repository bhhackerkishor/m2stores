import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  storeName: string;
  logo?: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress?: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  gstIn?: string;
  businessName?: string;
  businessAddress?: string;
  businessState?: string;
  businessStateCode?: string;
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  bankBranch?: string;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  freeShippingEnabled: boolean;
  expressFee: number;
  isCODEnabled: boolean;
  codMinOrderValue: number;
  codMaxOrderValue: number;
  codFee: number;
  /** COD pincode gate: "all" = every pincode, "allowlist" = only allowed pincodes/prefixes, "blocklist" = everything except blocked. */
  codPincodeMode: "all" | "allowlist" | "blocklist";
  codAllowedPincodes: string[];
  /** 3-digit PIN prefixes allowed when codPincodeMode = "allowlist" (e.g. "600".."641" = Tamil Nadu). */
  codAllowedPrefixes: string[];
  codBlockedPincodes: string[];
  /** Delivery serviceability gate with the same three modes. */
  deliveryPincodeMode: "all" | "allowlist" | "blocklist";
  deliveryAllowedPincodes: string[];
  deliveryAllowedPrefixes: string[];
  deliveryBlockedPincodes: string[];
  codDaysCal:number;
  returnWindowDays: number;
  phonePeMerchantId?: string;
  phonePeSaltKey?: string;
  phonePeSaltIndex?: number;
  phonePeEnvironment: "SANDBOX" | "PRODUCTION";
  phonePeHostUrl?: string;
  notificationEmailEnabled: boolean;
  notificationSMSEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  socialLinks?: Record<string, string>;
  footerText?: string;
  updatedAt: Date;
  createdAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    storeName: { type: String, default: "M2Stores" },
    logo: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    contactAddress: { type: String },
    currency: { type: String, default: "INR" },
    currencySymbol: { type: String, default: "₹" },
    taxRate: { type: Number, default: 18 },
    gstIn: { type: String },
    businessName: { type: String },
    businessAddress: { type: String },
    businessState: { type: String },
    businessStateCode: { type: String },
    bankName: { type: String },
    bankAccount: { type: String },
    bankIFSC: { type: String },
    bankBranch: { type: String },
    shippingFlatRate: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 499 },
    freeShippingEnabled: { type: Boolean, default: true },
    expressFee: { type: Number, default: 99 },
    isCODEnabled: { type: Boolean, default: true },
    codMinOrderValue: { type: Number, default: 0 },
    codMaxOrderValue: { type: Number, default: 10000 },
    codFee: { type: Number, default: 0 },
    codPincodeMode: { type: String, enum: ["all", "allowlist", "blocklist"], default: "all" },
    codAllowedPincodes: { type: [String], default: [] },
    codAllowedPrefixes: { type: [String], default: [] },
    codBlockedPincodes: { type: [String], default: [] },
    deliveryPincodeMode: { type: String, enum: ["all", "allowlist", "blocklist"], default: "all" },
    deliveryAllowedPincodes: { type: [String], default: [] },
    deliveryAllowedPrefixes: { type: [String], default: [] },
    deliveryBlockedPincodes: { type: [String], default: [] },
    returnWindowDays: { type: Number, default: 7 },
    codDaysCal: { type: Number, default: 3 },
    phonePeMerchantId: { type: String },
    phonePeSaltKey: { type: String },
    phonePeSaltIndex: { type: Number },
    phonePeEnvironment: { type: String, enum: ["SANDBOX", "PRODUCTION"], default: "SANDBOX" },
    phonePeHostUrl: { type: String },
    notificationEmailEnabled: { type: Boolean, default: true },
    notificationSMSEnabled: { type: Boolean, default: false },
    seoTitle: { type: String, default: "M2Stores - Online Shopping India" },
    seoDescription: { type: String, default: "Shop the best products at M2Stores - India's premium online marketplace for electronics, fashion, home & more." },
    socialLinks: { type: Schema.Types.Mixed },
    footerText: { type: String },
  },
  { timestamps: true }
);

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
