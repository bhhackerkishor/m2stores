import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/search`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/coupons`, changeFrequency: "weekly", priority: 0.5 },
  ];
  try {
    await connectDB();
    const [products, categories] = await Promise.all([
      Product.find({ status: "PUBLISHED" }).select("slug updatedAt").limit(5000).lean(),
      Category.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);
    return [
      ...staticRoutes,
      ...(categories as any[]).map((c) => ({
        url: `${base}/category/${c.slug}`,
        lastModified: c.updatedAt ? new Date(c.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...(products as any[]).map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
