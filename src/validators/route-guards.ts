import { z } from "zod";

/**
 * Route-level request payload schemas.
 *
 * These live here (not inside route modules) because Next.js typegen
 * validates that route files export only HTTP methods + config — extra
 * exports fail `next build`. Tests import them from this module.
 */

export const forgotPasswordRequestSchema = z.object({
  identifier: z.string().trim().min(5).max(200),
});

export const resetPasswordOtpSchema = z.object({
  identifier: z.string().trim().min(5).max(200),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const verifyOtpRequestSchema = z.object({
  identifier: z.string().trim().min(5).max(200),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  type: z.string().max(32).optional(),
});

export const notificationPatchSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid notification id").optional(),
  all: z.boolean().optional(),
});

export const moveWishlistToCartSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(100).optional(),
});

export const releaseExpiredSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional(),
});

export const adminRefundSchema = z.object({
  amount: z.number().positive().max(10000000).optional(),
  reason: z.string().trim().min(3, "Refund reason is required (min 3 chars)").max(500),
});

export const updateEtaSchema = z.object({
  estimatedDelivery: z.string().trim().min(1).max(40),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
});

export const updateLocationSchema = z.object({
  location: z.string().trim().min(1, "Location name is required").max(200),
  city: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
  status: z.string().trim().min(2).max(60).optional(),
});

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required (min 2 characters)").max(100),
  email: z.string().trim().email("A valid email address is required").max(200),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, "Message is required (min 10 characters)").max(5000),
});
