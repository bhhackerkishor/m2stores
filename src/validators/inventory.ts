import { z } from "zod";

const objectIdOrString = z.string().min(1);

export const reserveSchema = z.object({
  productId: objectIdOrString,
  sku: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(1000),
  orderId: z.string().min(1).max(128),
  orderItemId: z.string().min(1).max(128),
  operationId: z.string().min(1).max(128),
  reason: z.string().max(500).optional(),
});

export const commitSchema = z.object({
  productId: objectIdOrString,
  sku: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(1000),
  orderId: z.string().min(1).max(128),
  operationId: z.string().min(1).max(128),
  reason: z.string().max(500).optional(),
});

export const releaseSchema = commitSchema;

export const adjustSchema = z.object({
  productId: objectIdOrString,
  sku: z.string().min(1).max(64),
  delta: z.number().int().min(-100000).max(100000).refine((v) => v !== 0, "Delta must be non-zero"),
  reason: z.string().min(5).max(500),
  operationId: z.string().min(1).max(128).optional(),
});
