import { z } from "zod";

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const ALL_STATUSES = [
  "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED",
  "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
  "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RETURNED",
  "REFUND_PENDING", "REFUNDED", "PAYMENT_RECEIVED",
] as const;

export const adminStatusSchema = z.object({
  to: z.enum(ALL_STATUSES),
  notes: z.string().max(500).optional(),
  trackingNumber: z.string().max(100).optional(),
  courier: z.string().max(100).optional(),
});
