import { z } from "zod";

// Optional ObjectId refs: admin forms send null/"" when cleared — normalize to undefined.
const optionalRef = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().optional()
);

const productImageSchema = z.object({
  url: z.string().min(1),
  publicId: z.string().min(1),
  alt: z.string().optional().default(""),
  isPrimary: z.boolean().optional().default(false),
});

export const createProductSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  description: z.string().min(10),
  shortDescription: z.string().max(300).optional(),
  categoryId: z.string(),
  subcategoryId: optionalRef,
  brandId: optionalRef,
  images: z.array(productImageSchema).optional().default([]),
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(18),
  hasVariants: z.boolean().default(false),
  baseSKU: z.string().max(100).optional(),
  // Initial physical stock for non-variant products (stored in InventoryState, not Product).
  initialStock: z.number().int().min(0).max(1000000).optional(),
  variants: z
    .array(
      z.object({
        sku: z.string(),
        // Legacy rows may lack attributes — default to {} instead of 400.
        attributes: z.record(z.string()).optional().default({}),
        price: z.number().min(0),
        salePrice: z.number().min(0).optional(),
        images: z.array(z.string()).optional().default([]),
        isActive: z.boolean().default(true),
        // Physical stock for this variant SKU (InventoryState, stripped before Product save).
        stock: z.number().int().min(0).max(1000000).optional(),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  weight: z.number().min(0).optional(),
  dimensions: z
    .object({
      length: z.number().min(0).optional().default(0),
      width: z.number().min(0).optional().default(0),
      height: z.number().min(0).optional().default(0),
    })
    .optional(),
  warranty: z.string().max(500).optional(),
  returnPolicyDays: z.number().min(0).default(7),
  seo: z
    .object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      keywords: z.array(z.string()).optional(),
      ogImage: z.string().max(2000).optional(),
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
