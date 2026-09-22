"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyCart } from "@/components/ui/empty-state";
import { CartPageSkeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { Trash2, Heart, Minus, Plus, Truck, Tag, ArrowRight } from "lucide-react";

const FREE_SHIPPING_THRESHOLD = 499;

export default function CartPage() {
  const router = useRouter();
  const { items, pricing, issues, coupon, loading, updateQty, remove, clear, applyCoupon, removeCoupon, lastError } = useCart();
  const { add: addWish } = useWishlist();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      await applyCoupon(code.trim());
      toast.success("Coupon applied", `Code "${code.trim().toUpperCase()}" has been applied to your order.`);
      setCode("");
    } catch (e: any) {
      setCouponError(e?.message || "Invalid coupon");
      toast.error("Coupon invalid", e?.message || "This coupon code is not valid or has expired.");
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemove = async (sku: string, name: string) => {
    setRemoving(sku);
    try {
      await remove(sku);
      toast.info("Removed from cart", name.substring(0, 40));
    } finally {
      setRemoving(null);
    }
  };

  const handleMoveToWishlist = async (sku: string, productId: string, name: string) => {
    try {
      await addWish({ productId, sku });
      await remove(sku);
      toast.success("Saved to wishlist", name.substring(0, 40));
    } catch {
      // silent
    }
  };

  if (loading) return <CartPageSkeleton />;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyCart />
      </div>
    );
  }

  const subtotal = pricing?.subtotal || 0;
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 pb-28 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
        </div>
        <button
          onClick={() => { clear(); toast.info("Cart cleared"); }}
          className="text-sm text-surface-500 hover:text-danger-600 dark:text-surface-400 dark:hover:text-danger-400 transition-colors font-medium"
        >
          Clear cart
        </button>
      </div>

      {/* Errors */}
      {lastError && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          {lastError}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mb-4 space-y-2">
          {issues.map((iss, i) => (
            <div key={i} className="p-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-xl text-warning-700 dark:text-warning-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {iss.message}
            </div>
          ))}
        </div>
      )}

      {/* Free shipping progress */}
      <div className="mb-6 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4">
        <div className="flex items-center gap-2 text-sm mb-2">
          <Truck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          {subtotal >= FREE_SHIPPING_THRESHOLD ? (
            <span className="text-accent-600 dark:text-accent-400 font-medium">You&apos;ve unlocked FREE shipping!</span>
          ) : (
            <span className="text-surface-600 dark:text-surface-400">
              Add <span className="font-semibold text-surface-900 dark:text-surface-100">{formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}</span> more for FREE shipping
            </span>
          )}
        </div>
        <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.sku}
              className={`bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 flex gap-4 transition-opacity ${removing === item.sku ? "opacity-50" : ""}`}
            >
              <Link href={`/product/${item.slug}`} className="shrink-0">
                <Image
                  src={item.image || "/images/placeholder-product.svg"}
                  alt={item.name}
                  width={120}
                  height={120}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover bg-surface-100"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.slug}`}
                  className="font-semibold text-sm sm:text-base text-surface-900 dark:text-surface-100 hover:text-brand-600 dark:hover:text-brand-400 line-clamp-2 transition-colors"
                >
                  {item.name}
                </Link>
                <p className="text-[11px] text-surface-400 dark:text-surface-500 font-mono mt-0.5">{item.sku}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="price">{formatPrice(item.unitPrice)}</span>
                  {item.discount > 0 && (
                    <span className="text-[11px] font-semibold bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 px-1.5 py-0.5 rounded-md">
                      {item.discount}% off
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                  {/* Quantity */}
                  <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQty(item.sku, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target press-scale"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.sku, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target press-scale"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => handleMoveToWishlist(item.sku, item.productId, item.name)}
                      className="flex items-center gap-1 text-surface-500 hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400 transition-colors font-medium press-scale"
                    >
                      <Heart className="w-3.5 h-3.5" /> Save for later
                    </button>
                    <button
                      onClick={() => handleRemove(item.sku, item.name)}
                      className="flex items-center gap-1 text-surface-500 hover:text-danger-600 dark:text-surface-400 dark:hover:text-danger-400 transition-colors font-medium press-scale"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="price">{formatPrice(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="font-semibold text-sm">Apply Coupon</h3>
            </div>
            {coupon ? (
              <div className="flex items-center justify-between bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800 rounded-lg px-3 py-2">
                <span className="font-mono font-bold text-accent-700 dark:text-accent-400 text-sm">{coupon}</span>
                <button
                  onClick={() => { removeCoupon(); toast.info("Coupon removed"); }}
                  className="text-xs text-danger-600 hover:underline font-medium"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    className="uppercase font-mono text-sm"
                  />
                  <Button onClick={handleApply} isLoading={couponBusy} size="md" className="shrink-0">
                    Apply
                  </Button>
                </div>
                {couponError && <p className="text-xs text-danger-600 mt-2">{couponError}</p>}
              </>
            )}
          </Card>

          {/* Order Summary */}
          <Card>
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Subtotal</span>
                <span className="font-medium">{formatPrice(pricing?.subtotal || 0)}</span>
              </div>
              {(pricing?.couponDiscount || 0) > 0 && (
                <div className="flex justify-between text-accent-600 dark:text-accent-400">
                  <span className="font-medium">Coupon ({pricing?.couponCode})</span>
                  <span className="font-semibold">−{formatPrice(pricing?.couponDiscount || 0)}</span>
                </div>
              )}
              {((pricing as any)?.offerDiscount || 0) > 0 && (
                <div className="flex justify-between text-accent-600 dark:text-accent-400">
                  <span className="font-medium">Offer ({(pricing as any)?.offerTitle || "Offer"})</span>
                  <span className="font-semibold">−{formatPrice((pricing as any)?.offerDiscount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Shipping</span>
                <span className="font-medium">{(pricing?.shippingFee || 0) === 0 ? <span className="text-accent-600 dark:text-accent-400 font-semibold">FREE</span> : formatPrice(pricing?.shippingFee || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Tax (GST)</span>
                <span className="font-medium">{formatPrice(pricing?.taxTotal || 0)}</span>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-3 flex justify-between">
                <span className="font-bold text-base">Total</span>
                <span className="font-bold text-lg price">{formatPrice(pricing?.grandTotal || 0)}</span>
              </div>
            </div>
            <Button className="w-full mt-5" size="lg" onClick={() => router.push("/checkout")}>
              Proceed to Checkout <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-[11px] text-surface-400 dark:text-surface-500 text-center mt-2">
              Prices revalidated securely on the server at checkout.
            </p>
          </Card>
        </div>
      </div>

      {/* Sticky mobile checkout */}
      <div className="lg:hidden fixed bottom-[60px] left-0 right-0 bg-white/95 dark:bg-surface-950/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-800 p-4 flex items-center justify-between z-30 pb-safe">
        <div>
          <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">Total</p>
          <p className="font-bold text-lg price">{formatPrice(pricing?.grandTotal || 0)}</p>
        </div>
        <Button size="lg" onClick={() => router.push("/checkout")}>
          Checkout <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
