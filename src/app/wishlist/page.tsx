"use client";

import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { EmptyWishlist } from "@/components/ui/empty-state";
import { ShoppingCart, Heart } from "lucide-react";
import { useState } from "react";

export default function WishlistPage() {
  const { items, loading, remove, moveToCart } = useWishlist();
  const { refresh: refreshCart } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  
  const handleMove = async (sku: string, name: string) => {
    setBusy(sku);
    try {
      await moveToCart(sku, 1);
      await refreshCart();
      toast.success("Moved to cart", name);
    } finally {
      setBusy(null);
    }
  };
  const handleRemove = async (sku: string, name: string) => {
    await remove(sku);
    toast.info("Removed from wishlist", name);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="h-8 bg-surface-100 dark:bg-surface-800 rounded w-40 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-100 dark:bg-surface-800 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return <EmptyWishlist />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
          <Heart className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Wishlist</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">{items.length} item(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.sku} className="overflow-hidden group">
            <Link href={`/product/${item.slug}`}>
              <div className="relative aspect-square bg-surface-100 dark:bg-surface-800">
                <Image
                  src={item.image || "https://via.placeholder.com/300x300"}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
                {!item.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="danger" size="sm">Out of Stock</Badge>
                  </div>
                )}
              </div>
            </Link>
            <div className="p-3">
              <Link href={`/product/${item.slug}`} className="text-sm font-medium text-surface-900 dark:text-surface-100 line-clamp-2 min-h-[2.5rem] hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                {item.name}
              </Link>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-bold text-sm text-surface-900 dark:text-surface-100 tabular-nums">{formatPrice(item.unitPrice)}</span>
                {item.mrp > item.unitPrice && (
                  <span className="text-xs text-surface-400 line-through tabular-nums">{formatPrice(item.mrp)}</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!item.inStock || busy === item.sku}
                  isLoading={busy === item.sku}
                  onClick={() => handleMove(item.sku, item.name)}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(item.sku, item.name)}
                  aria-label="Remove from wishlist"
                >
                  <Heart className="w-4 h-4 fill-danger-500 text-danger-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
