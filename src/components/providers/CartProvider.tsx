"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export interface CartItem {
  productId: string;
  sku: string;
  quantity: number;
  requestedQuantity: number;
  name: string;
  slug: string;
  image?: string;
  attributes: Record<string, string>;
  unitPrice: number;
  mrp: number;
  discount: number;
  lineTotal: number;
  available: number;
}

export interface CartPricing {
  subtotal: number;
  itemsDiscount: number;
  couponDiscount: number;
  couponCode: string;
  shippingFee: number;
  codFee: number;
  taxTotal: number;
  grandTotal: number;
}

interface CartContextType {
  items: CartItem[];
  pricing: CartPricing | null;
  issues: Array<{ sku: string; type: string; message: string; available?: number }>;
  coupon: string;
  loading: boolean;
  totalItems: number;
  refresh: () => Promise<void>;
  add: (input: { productId?: string; sku?: string; quantity?: number }) => Promise<void>;
  updateQty: (sku: string, quantity: number) => Promise<void>;
  remove: (sku: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  mergeGuest: () => Promise<void>;
  lastError: string;
}

const CartContext = createContext<CartContextType | null>(null);

const emptyPricing: CartPricing = {
  subtotal: 0, itemsDiscount: 0, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 0, grandTotal: 0,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pricing, setPricing] = useState<CartPricing | null>(null);
  const [issues, setIssues] = useState<CartContextType["issues"]>([]);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState("");

  const applyView = useCallback((view: any) => {
    setItems(view.items || []);
    setPricing(view.pricing || emptyPricing);
    setIssues(view.issues || []);
    setCoupon(view.appliedCouponCode || "");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const data = await res.json();
      if (data.success) applyView(data.data);
    } catch {
      // offline — keep local state
    } finally {
      setLoading(false);
    }
  }, [applyView]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (fn: () => Promise<Response>) => {
      setLastError("");
      const res = await fn();
      const data = await res.json();
      if (!data.success) {
        setLastError(data.error?.message || "Cart update failed");
        throw new Error(data.error?.message || "Cart update failed");
      }
      applyView(data.data);
    },
    [applyView]
  );

  const add = useCallback(
    async (input: { productId?: string; sku?: string; quantity?: number }) => {
      await mutate(() =>
        fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      );
      trackEvent("add_to_cart", { sku: input.sku, productId: input.productId, quantity: input.quantity || 1 });
    },
    [mutate]
  );

  const updateQty = useCallback(
    (sku: string, quantity: number) =>
      mutate(() => fetch("/api/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, quantity }) })),
    [mutate]
  );

  const remove = useCallback(
    async (sku: string) => {
      await mutate(() => fetch(`/api/cart?sku=${encodeURIComponent(sku)}`, { method: "DELETE" }));
      trackEvent("remove_from_cart", { sku });
    },
    [mutate]
  );

  const clear = useCallback(() => mutate(() => fetch("/api/cart", { method: "DELETE" })), [mutate]);

  const applyCoupon = useCallback(
    (code: string) =>
      mutate(() => fetch("/api/cart/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })),
    [mutate]
  );

  const removeCoupon = useCallback(() => mutate(() => fetch("/api/cart/coupon", { method: "DELETE" })), [mutate]);

  const mergeGuest = useCallback(async () => {
    try {
      await fetch("/api/cart/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    } catch {
      // ignore — server also auto-merges on login
    }
    await refresh();
  }, [refresh]);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, pricing, issues, coupon, loading, totalItems, refresh, add, updateQty, remove, clear, applyCoupon, removeCoupon, mergeGuest, lastError }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
