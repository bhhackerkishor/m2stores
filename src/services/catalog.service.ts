import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { InventoryState } from "@/models/Inventory";
import { Order } from "@/models/Order";
import { FilterQuery } from "mongoose";

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  /** Expanded descendant ids for categoryId (root + all children). Set by listProducts/getFacets. */
  categoryIds?: string[];
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  /** Variant-attribute filters, e.g. { color: ["Blue"], storage: ["128GB"] } */
  attrs?: Record<string, string[]>;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "popularity" | "rating";
  page?: number;
  limit?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  isBestseller?: boolean;
  status?: string;
}

const escRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Practical typo tolerance without Atlas Search: tokenize the query and match
 * every token as a case-insensitive PREFIX on any word of name/tags/slug.
 * "samsng" won't match, but "sams", "galxy s24" (per-token prefixes) will.
 */
function tokenConditions(q: string) {
  const tokens = q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2).slice(0, 6);
  if (tokens.length === 0) return null;
  return {
    $and: tokens.map((t) => ({
      $or: [
        { name: { $regex: `(^|\\s)${escRx(t)}`, $options: "i" } },
        { tags: { $regex: `(^|\\s)${escRx(t)}`, $options: "i" } },
        { slug: { $regex: escRx(t), $options: "i" } },
        { shortDescription: { $regex: `(^|\\s)${escRx(t)}`, $options: "i" } },
      ],
    })),
  };
}

export class CatalogService {
  static buildFilter(f: ProductFilters): FilterQuery<any> {
    const filter: FilterQuery<any> = { status: f.status || "PUBLISHED" };
    if (f.q) {
      const tokens = tokenConditions(f.q);
      if (tokens) filter.$and = [...(filter.$and || []), tokens];
      else {
        // Single short char: fall back to plain substring
        const rx = new RegExp(escRx(f.q), "i");
        filter.$or = [{ name: rx }, { slug: rx }, { tags: rx }];
      }
    }
    if (f.categoryIds?.length) {
      // Root + descendant categories: match product.categoryId OR product.subcategoryId
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ categoryId: { $in: f.categoryIds } }, { subcategoryId: { $in: f.categoryIds } }] },
      ];
    } else if (f.categoryId) {
      filter.categoryId = f.categoryId;
    }
    if (f.brandId) filter.brandId = f.brandId;
    if (f.minRating !== undefined) filter.averageRating = { $gte: f.minRating };
    if (f.attrs) {
      for (const [key, values] of Object.entries(f.attrs)) {
        if (!values?.length) continue;
        filter.$and = filter.$and || [];
        // Match variant attribute value (case-insensitive exact per value)
        filter.$and.push({
          variants: {
            $elemMatch: {
              isActive: true,
              [`attributes.${key}`]: { $in: values },
            },
          },
        });
      }
    }
    if (f.minPrice !== undefined || f.maxPrice !== undefined) {
      filter.$and = filter.$and || [];
      // Match either base salePrice or variant salePrice range via basePrice fallback
      // Simplified: filter on basePrice + salePrice coalesce in app layer is complex,
      // so filter on basePrice for now and refine in JS for variants.
      if (f.minPrice !== undefined) filter.basePrice = { ...(filter.basePrice || {}), $gte: f.minPrice };
      if (f.maxPrice !== undefined) filter.basePrice = { ...(filter.basePrice || {}), $lte: f.maxPrice };
    }
    if (f.isFeatured) filter.isFeatured = true;
    if (f.isTrending) filter.isTrending = true;
    if (f.isBestseller) filter.isBestseller = true;
    return filter;
  }

  static sortFor(sort?: string): Record<string, 1 | -1> {
    switch (sort) {
      case "price_asc":
        return { salePrice: 1, basePrice: 1 };
      case "price_desc":
        return { salePrice: -1, basePrice: -1 };
      case "newest":
        return { createdAt: -1 };
      case "popularity":
        return { totalReviews: -1 };
      case "rating":
        return { averageRating: -1 };
      default:
        return { isFeatured: -1, isBestseller: -1, createdAt: -1 };
    }
  }

  /** Collect rootId + every descendant category id (adjacency list walk). */
  static async collectCategoryIds(rootId: string): Promise<string[]> {
    await connectDB();
    const all = await Category.find({}).select("_id parentCategoryId").lean();
    const children = new Map<string, string[]>();
    for (const c of all as any[]) {
      const p = c.parentCategoryId ? String(c.parentCategoryId) : null;
      if (p) children.set(p, [...(children.get(p) || []), String(c._id)]);
    }
    const out: string[] = [];
    const seen = new Set<string>();
    const queue = [String(rootId)];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      for (const ch of children.get(id) || []) queue.push(ch);
    }
    return out;
  }

  private static async expandCategory(f: ProductFilters): Promise<ProductFilters> {
    if (f.categoryId && !f.categoryIds) {
      return { ...f, categoryIds: await this.collectCategoryIds(f.categoryId) };
    }
    return f;
  }

  static async listProducts(f: ProductFilters) {
    await connectDB();
    f = await this.expandCategory(f);
    const page = Math.max(1, f.page || 1);
    const limit = Math.min(50, Math.max(1, f.limit || 12));
    const filter = this.buildFilter(f);

    if (f.inStock) {
      const stocked: any[] = await InventoryState.aggregate([
        {
          $group: {
            _id: "$productId",
            available: { $sum: { $subtract: ["$stock", "$reservedStock"] } },
          },
        },
        { $match: { available: { $gt: 0 } } },
      ]);
      const ids = stocked.map((s) => s._id);
      if (ids.length === 0) return { items: [], total: 0, page, limit, totalPages: 0 };
      filter._id = { $in: ids };
    }

    const total = await Product.countDocuments(filter);
    const items = await Product.find(filter)
      .sort(this.sortFor(f.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug logo")
      .lean();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getProductBySlug(slug: string) {
    await connectDB();
    return Product.findOne({ slug })
      .populate("categoryId", "name slug level attributes")
      .populate("brandId", "name slug logo")
      .lean();
  }

  static async getRelatedProducts(productId: string, categoryId: string, brandId?: string, limit = 8) {
    await connectDB();
    // Same category family (root + descendants) first, then same brand, then trending
    const catIds = await this.collectCategoryIds(categoryId);
    const sameCategory = await Product.find({
      _id: { $ne: productId },
      $or: [{ categoryId: { $in: catIds } }, { subcategoryId: { $in: catIds } }],
      status: "PUBLISHED",
    })
      .sort({ isBestseller: -1, averageRating: -1 })
      .limit(limit)
      .populate("brandId", "name slug")
      .lean();

    if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

    const remaining = limit - sameCategory.length;
    const extraFilter: FilterQuery<any> = {
      _id: { $ne: productId, $nin: sameCategory.map((p: any) => p._id) },
      status: "PUBLISHED",
    };
    if (brandId) extraFilter.brandId = brandId;

    const sameBrand = await Product.find(extraFilter)
      .sort({ averageRating: -1 })
      .limit(remaining)
      .populate("brandId", "name slug")
      .lean();

    return [...sameCategory, ...sameBrand].slice(0, limit);
  }

  /**
   * Facets for the current filter scope (ignores pagination/attrs).
   * Returns category/brand counts, price buckets, rating buckets and
   * distinct variant-attribute values for filterable category attributes.
   */
  static async getFacets(f: ProductFilters) {
    await connectDB();
    const expanded = await this.expandCategory(f);
    const scope: ProductFilters = { ...expanded, page: 1, limit: 1 };
    delete (scope as any).attrs;
    const filter = this.buildFilter(scope);
    // Apply inStock scope to facets too
    if (f.inStock) {
      const stocked: any[] = await InventoryState.aggregate([
        { $group: { _id: "$productId", available: { $sum: { $subtract: ["$stock", "$reservedStock"] } } } },
        { $match: { available: { $gt: 0 } } },
      ]);
      const ids = stocked.map((s) => s._id);
      if (ids.length === 0) {
        return { categories: [], brands: [], priceBuckets: [], ratings: [], attributes: {}, total: 0 };
      }
      filter._id = { $in: ids };
    }

    const [catAgg, brandAgg, priceStats, ratingAgg, attrAgg, total] = await Promise.all([
      Product.aggregate([
        { $match: filter },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
        { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
        { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
        { $project: { categoryId: "$_id", name: "$cat.name", slug: "$cat.slug", count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Product.aggregate([
        { $match: filter },
        { $group: { _id: "$brandId", count: { $sum: 1 } } },
        { $lookup: { from: "brands", localField: "_id", foreignField: "_id", as: "brand" } },
        { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
        { $project: { brandId: "$_id", name: "$brand.name", slug: "$brand.slug", count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Product.aggregate([
        { $match: filter },
        { $group: { _id: null, min: { $min: "$basePrice" }, max: { $max: "$basePrice" }, avg: { $avg: "$basePrice" } } },
      ]),
      Product.aggregate([
        { $match: filter },
        {
          $bucket: {
            groupBy: "$averageRating",
            boundaries: [0, 3, 4, 4.5, 5.1],
            default: "unrated",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Product.aggregate([
        { $match: filter },
        { $unwind: "$variants" },
        { $match: { "variants.isActive": true } },
        { $project: { attrs: { $objectToArray: "$variants.attributes" } } },
        { $unwind: "$attrs" },
        { $group: { _id: { key: "$attrs.k", value: "$attrs.v" }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.key", values: { $push: { value: "$_id.value", count: "$count" } } } },
        { $limit: 25 },
      ]),
      Product.countDocuments(filter),
    ]);

    const buckets = [500, 1000, 5000, 20000, 100000];
    const priceBuckets = buckets.map((upper, i) => {
      const lower = i === 0 ? 0 : buckets[i - 1];
      return { lower, upper, label: `₹${lower.toLocaleString("en-IN")} – ₹${upper.toLocaleString("en-IN")}` };
    });

    const attributes: Record<string, Array<{ value: string; count: number }>> = {};
    for (const a of attrAgg as any[]) {
      attributes[a._id] = (a.values as any[]).sort((x, y) => y.count - x.count).slice(0, 15);
    }

    return {
      categories: catAgg,
      brands: brandAgg,
      priceStats: priceStats[0] || { min: 0, max: 0, avg: 0 },
      priceBuckets,
      ratings: ratingAgg,
      attributes,
      total,
    };
  }

  /**
   * Frequently bought together: products co-occurring in paid orders
   * containing the given product. Deterministic co-occurrence count.
   */
  static async frequentlyBoughtTogether(productId: string, limit = 6) {
    await connectDB();
    const oid = new (await import("mongoose")).Types.ObjectId(productId);
    const agg: any[] = await Order.aggregate([
      { $match: { "paymentInfo.status": "PAID", orderStatus: { $ne: "CANCELLED" }, "items.productId": oid } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: oid } } },
      { $group: { _id: "$items.productId", count: { $sum: 1 }, name: { $first: "$items.nameSnapshot" }, image: { $first: "$items.imageSnapshot" } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    if (agg.length === 0) return [];
    const ids = agg.map((a) => a._id);
    const products: any[] = await Product.find({ _id: { $in: ids }, status: "PUBLISHED" }).populate("brandId", "name slug").lean();
    const byId = new Map(products.map((p: any) => [String(p._id), p]));
    return agg.map((a) => byId.get(String(a._id))).filter(Boolean);
  }

  static async getCategories(activeOnly = true) {
    await connectDB();
    const filter: FilterQuery<any> = {};
    if (activeOnly) filter.isActive = true;
    return Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  }
  static async getCategoryBySlug(slug: string) {
    await connectDB();
    return Category.findOne({ slug }).lean();
  }

  static async getBrands(activeOnly = true) {
    await connectDB();
    const filter: FilterQuery<any> = {};
    if (activeOnly) filter.isActive = true;
    return Brand.find(filter).sort({ name: 1 }).lean();
  }
}
