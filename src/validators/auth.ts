import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(5, "Identifier must be at least 5 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  otp: z.string().length(6).optional(),
});

export const verifyOtpSchema = z.object({
  identifier: z.string(),
  otp: z.string().length(6),
  type: z.enum(["login", "register", "password-reset"]),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(5),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const createAddressSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  landmark: z.string().max(100).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, "Invalid Indian PIN code"),
  country: z.string().default("India"),
  isDefault: z.boolean().optional(),
});

export const addToCartSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().min(1).max(100),
});

export const updateCartItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().min(0).max(100),
});

export const applyCouponSchema = z.object({
  code: z.string().min(2).max(20),
});

export const createOrderIdempotencySchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  notes: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  adjustmentType: z.enum(["ADD", "SUBTRACT", "SET"]),
  quantity: z.number().min(-10000).max(10000),
  reason: z.string().min(5).max(500),
});
