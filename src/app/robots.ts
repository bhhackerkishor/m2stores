import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/", "/category/", "/search"],
        disallow: ["/admin", "/api/", "/cart", "/checkout", "/orders", "/profile", "/order-success"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
