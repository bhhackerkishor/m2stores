import { z } from "zod";

const couponBase = z.object({
  code: z.string().trim().min(2).max(20),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().min(0).max(100000),
  minOrderValue: z.number().min(0).default(0),
  maxDiscountAmount: z.number().min(0).optional(),
  applicableCategoryIds: z.array(z.string()).default([]),
  applicableProductIds: z.array(z.string()).default([]),
  applicableBrandIds: z.array(z.string()).default([]),
  isFirstOrderOnly: z.boolean().default(false),
  allowedUserIds: z.array(z.string()).default([]),
  usageLimitTotal: z.number().min(1).default(1000),
  perUserLimit: z.number().min(1).default(1),
  startDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
  isActive: z.boolean().default(true),
});

export const createCouponSchema = couponBase.refine((v) => new Date(v.expiryDate) > new Date(v.startDate), { message: "expiryDate must be after startDate", path: ["expiryDate"] });

export const updateCouponSchema = couponBase.partial();

const offerBase = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional(),
  type: z.enum(["PERCENTAGE", "FREE_SHIPPING", "BXGY"]),
  discountValue: z.number().min(0).max(100).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  buyQty: z.number().int().min(1).optional(),
  getQty: z.number().int().min(1).optional(),
  applicableCategoryIds: z.array(z.string()).default([]),
  applicableProductIds: z.array(z.string()).default([]),
  applicableBrandIds: z.array(z.string()).default([]),
  minOrderValue: z.number().min(0).default(0),
  startDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});

export const createOfferSchema = offerBase.refine((v) => new Date(v.expiryDate) > new Date(v.startDate), { message: "expiryDate must be after startDate", path: ["expiryDate"] });

export const updateOfferSchema = offerBase.partial();

export const createBannerSchema = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(300).optional(),
  type: z.enum(["HERO", "PROMOTIONAL", "CATEGORY", "PRODUCT_COLLECTION", "CAMPAIGN"]),
  image: z.object({ url: z.string().url(), publicId: z.string().min(1) }),
  link: z.string().max(500).optional(),
  linkType: z.enum(["PRODUCT", "CATEGORY", "PAGE", "URL"]).optional(),
  linkTarget: z.string().max(200).optional(),
  ordering: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().or(z.date()).optional(),
  expiryDate: z.string().or(z.date()).optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const saveHomepageSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string().min(1).max(64),
      type: z.enum(["BANNER", "CATEGORY_GRID", "PRODUCT_GRID", "PROMO_STRIP", "BRAND_LOGO", "FEATURED_SECTION"]),
      title: z.string().max(200).optional(),
      subtitle: z.string().max(300).optional(),
      image: z.object({ url: z.string().url(), publicId: z.string() }).optional(),
      link: z.string().max(500).optional(),
      productIds: z.array(z.string()).default([]),
      categoryIds: z.array(z.string()).default([]),
      bannerIds: z.array(z.string()).default([]),
      ordering: z.number().int().min(0).default(0),
      isActive: z.boolean().default(true),
      config: z.record(z.unknown()).optional(),
    })
  ).max(20),
});
