import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  description: z.string().min(10),
  shortDescription: z.string().max(300).optional(),
  categoryId: z.string(),
  brandId: z.string().optional(),
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(18),
  hasVariants: z.boolean().default(false),
  variants: z
    .array(
      z.object({
        sku: z.string(),
        attributes: z.record(z.string()),
        price: z.number().min(0),
        salePrice: z.number().min(0).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  returnPolicyDays: z.number().min(0).default(7),
  seo: z
    .object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  specifications: z
    .array(
      z.object({
        group: z.string(),
        key: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const inventoryAdjustmentSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  adjustmentType: z.enum(["ADD", "SUBTRACT", "SET"]),
  quantity: z.number().min(-100000).max(100000),
  reason: z.string().min(5).max(500),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.string().optional().transform((v) => parseInt(v || "1")),
  limit: z.string().optional().transform((v) => parseInt(v || "12")),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "popularity", "rating"]).default("relevance"),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.string().optional().transform((v) => parseFloat(v || "0")),
  maxPrice: z.string().optional().transform((v) => parseFloat(v || "999999")),
});
