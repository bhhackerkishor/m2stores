import { z } from "zod";

export const requestReturnSchema = z.object({
  items: z.array(z.object({ sku: z.string().min(1).max(64), quantity: z.number().int().min(1).max(100) })).min(1).max(20),
  reason: z.string().trim().min(5).max(1000),
  idempotencyKey: z.string().uuid().optional(),
});

export const shipmentSchema = z.object({
  courier: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().min(3).max(100),
  provider: z.string().trim().max(50).optional(),
  fee: z.number().min(0).optional(),
});

export const trackingEventSchema = z.object({
  status: z.string().trim().min(2).max(60),
  location: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
});

export const returnActionSchema = z.object({
  action: z.enum(["approve", "reject", "receive", "refund"]),
  reason: z.string().trim().max(2000).optional(),
  pickupStatus: z.enum(["SCHEDULED", "PICKED_UP", "RECEIVED"]).optional(),
  notes: z.string().trim().max(2000).optional(),
});
