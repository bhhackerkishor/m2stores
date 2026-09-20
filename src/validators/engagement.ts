import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(200),
  review: z.string().trim().min(10).max(5000),
  images: z.array(z.string().url()).max(5).optional(),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(5).max(200),
  category: z.enum(["ORDER_ISSUE", "PAYMENT_ISSUE", "PRODUCT_QUALITY", "SHIPPING_ISSUE", "RETURNS", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  message: z.string().trim().min(5).max(10000),
  orderId: z.string().optional(),
});

export const replySchema = z.object({
  content: z.string().trim().min(1).max(10000),
  nextStatus: z.enum(["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
});
