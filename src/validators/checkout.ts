import { z } from "zod";

export const validateCheckoutSchema = z.object({
  addressId: z.string().min(1),
  shippingMethod: z.enum(["STANDARD", "EXPRESS"]).default("STANDARD"),
  paymentMethod: z.enum(["PHONEPE", "COD"]),
  couponCode: z.string().max(20).optional(),
});

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  shippingMethod: z.enum(["STANDARD", "EXPRESS"]).default("STANDARD"),
  paymentMethod: z.enum(["PHONEPE", "COD"]),
  couponCode: z.string().max(20).optional(),
  idempotencyKey: z.string().uuid().optional(),
});
