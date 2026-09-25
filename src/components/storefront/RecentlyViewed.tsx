// components/storefront/RecentlyViewed.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { formatPrice } from "@/lib/utils";

export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const slugs = useRecentlyViewed(excludeSlug);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (slugs.length === 0) return;
    Promise.all(
      slugs.slice(0, 4).map((s) =>
        fetch(`/api/products/${s}`)
          .then((r) => r.json())
          .then((d) => (d.success ? d.data : null))
          .catch(() => null)
      )
    ).then((list) => setItems(list.filter(Boolean)));
  }, [slugs.join(",")]);

  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 section-y-sm !pt-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="!text-xl">Recently Viewed</h2>
        <Link href="/shop" className="text-brand-600 dark:text-brand-400 text-sm font-semibold hover:underline">
          Shop more →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {items.map((p) => (
          <Link
            key={p._id}
            href={`/product/${p.slug}`}
            className="bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 p-3 hover:shadow-card-hover transition-shadow"
          >
            <Image
              src={p.images?.[0]?.url || "/images/placeholder-product.svg"}
              alt={p.name}
              width={300}
              height={300}
              className="w-full aspect-square object-cover rounded-sm mb-2"
              loading="lazy"
            />
            <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem] text-surface-800 dark:text-surface-100">{p.name}</p>
            <p className="price-sm mt-1">{formatPrice(p.salePrice || p.basePrice)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}