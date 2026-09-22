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
      slugs.slice(0, 4).map((s) => fetch(`/api/products/${s}`).then((r) => r.json()).then((d) => (d.success ? d.data : null)).catch(() => null))
    ).then((list) => setItems(list.filter(Boolean)));
  }, [slugs.join(",")]);

  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Recently Viewed</h2>
        <Link href="/shop" className="text-blue-600 text-sm font-semibold hover:underline">Shop more →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((p) => (
          <Link key={p._id} href={`/product/${p.slug}`} className="bg-white rounded-xl border border-surface-200 p-3 hover:shadow-card-hover transition-shadow">
            <Image src={p.images?.[0]?.url || "/images/placeholder-product.svg"} alt={p.name} width={300} height={300} className="w-full h-32 object-cover rounded-lg mb-2" loading="lazy" />
            <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</p>
            <p className="font-bold text-sm mt-1">{formatPrice(p.salePrice || p.basePrice)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
