"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export interface WishlistItem {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  image?: string;
  unitPrice: number;
  mrp: number;
  inStock: boolean;
  available: number;
  stock: number;
  isActive: boolean;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  add: (input: { productId?: string; sku?: string }) => Promise<void>;
  remove: (sku: string) => Promise<void>;
  moveToCart: (sku: string, quantity?: number) => Promise<void>;
  isWished: (sku: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setItems(data.data.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: { productId?: string; sku?: string }) => {
      const res = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Wishlist update failed");
      setItems(data.data.items || []);
      trackEvent("wishlist_add", { sku: input.sku, productId: input.productId });
    },
    []
  );

  const remove = useCallback(async (sku: string) => {
    const res = await fetch(`/api/wishlist?sku=${encodeURIComponent(sku)}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Remove failed");
    setItems(data.data.items || []);
  }, []);

  const moveToCart = useCallback(async (sku: string, quantity = 1) => {
    const res = await fetch("/api/wishlist/move-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Move failed");
    await refresh();
  }, [refresh]);

  const isWished = useCallback((sku: string) => items.some((i) => i.sku === sku.toUpperCase()), [items]);

  return (
    <WishlistContext.Provider value={{ items, loading, refresh, add, remove, moveToCart, isWished }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
