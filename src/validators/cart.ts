import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().min(1).optional(),
  sku: z.string().optional().or(z.literal("")),
  quantity: z.number().int().min(1).max(10).default(1),
}).refine((v) => v.productId || v.sku, { message: "productId or sku is required" });

export const updateCartItemSchema = z.object({
  sku: z.string().min(1).max(64),
  quantity: z.number().int().min(0).max(10),
});

export const removeCartItemSchema = z.object({
  sku: z.string().min(1).max(64),
});

export const applyCouponSchema = z.object({
  code: z.string().min(2).max(20),
});

export const mergeCartSchema = z.object({
  guestSessionId: z.string().min(1).max(128),
});

export const addToWishlistSchema = z.object({
  productId: z.string().min(1).optional(),
  sku: z.string().min(1).max(64).optional(),
}).refine((v) => v.productId || v.sku, { message: "productId or sku is required" });
