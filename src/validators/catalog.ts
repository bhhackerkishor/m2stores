import { z } from "zod";

/**
 * Slug is always used as a plain string value in queries (never an object),
 * so validation is about type + bounds. Lowercased on the way in.
 */
const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .max(120)
  .transform((v) => v.toLowerCase());

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const brandSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  logo: z.string().trim().max(500).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const brandUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  logo: z.string().trim().max(500).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const categoryAttributeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(["TEXT", "SELECT", "NUMBER"]),
  options: z.array(z.string().trim().max(60)).max(50).optional(),
  isFilterable: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: slugSchema,
  description: z.string().trim().max(2000).optional(),
  image: z.string().trim().max(500).optional(),
  parentCategoryId: z.union([objectId, z.literal(""), z.null()]).optional(),
  attributes: z.array(categoryAttributeSchema).max(30).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT is an explicit-field update — never spreads the raw body into MongoDB.
 * Unknown keys are stripped by Zod, closing the mass-assignment vector.
 */
export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  image: z.string().trim().max(500).optional(),
  parentCategoryId: z.union([objectId, z.literal(""), z.null()]).optional(),
  attributes: z.array(categoryAttributeSchema).max(30).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

/** GET /api/categories?parentId= */
export const categoryListQuerySchema = z.object({
  parentId: objectId.optional(),
  active: z.enum(["true", "false"]).optional(),
});

/** GET /api/inventory?sku=&productId= */
export const inventoryCheckQuerySchema = z.object({
  sku: z.string().trim().min(1).max(64).optional(),
  productId: objectId.optional(),
});

export const inventoryCheckSchema = z.object({
  productId: objectId,
  sku: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(10000),
});
