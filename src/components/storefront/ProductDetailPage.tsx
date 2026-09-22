"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { VariantSelector } from "@/components/storefront/VariantSelector";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, Heart, Truck, Shield, Package, ChevronRight } from "lucide-react";

interface ProductPageProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    images: { url: string; publicId: string; alt?: string; isPrimary: boolean }[];
    brand?: { name: string; slug: string };
    categoryId?: { name: string; slug: string };
    basePrice: number;
    salePrice?: number;
    costPrice?: number;
    taxRate: number;
    hasVariants: boolean;
    baseSKU?: string;
    variants: Array<{
      sku: string;
      attributes: Record<string, string>;
      price: number;
      salePrice?: number;
      isActive: boolean;
    }>;
    specifications: Array<{ group: string; key: string; value: string }>;
    tags: string[];
    isFeatured: boolean;
    isTrending: boolean;
    isBestseller: boolean;
    averageRating: number;
    totalReviews: number;
    returnPolicyDays: number;
  };
}

export function ProductDetailPage({ product, deliveryDays = 3 }: ProductPageProps & { deliveryDays?: number }) {
  const router = useRouter();
  const { add } = useCart();
  const { add: addWish, remove: removeWish, isWished } = useWishlist();
  const toast = useToast();
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState("");

  const activeVariants = product.variants.filter((v) => v.isActive);
  const variantNames = product.hasVariants ? Object.keys(activeVariants[0]?.attributes || {}) : [];

  const selectedVariant = product.variants.find((v) => v.sku === selectedSku);
  const currentPrice = selectedVariant?.salePrice || selectedVariant?.price || product.salePrice || product.basePrice;
  const discount = product.basePrice && product.salePrice
    ? Math.round((1 - product.salePrice / product.basePrice) * 100)
    : 0;

  const resolvedSku = selectedSku || (product.hasVariants ? product.variants[0]?.sku : product.baseSKU) || "";
  const wished = resolvedSku ? isWished(resolvedSku) : false;
  const handleAddToCart = async (buyNow = false) => {
    if (product.hasVariants && !selectedSku) {
      setNotice("Please select a variant first.");
      return;
    }
    setNotice("");
    setIsAdding(true);
    try {
      await add({ productId: product._id, sku: resolvedSku, quantity });
      toast.success("Added to cart", product.name.substring(0, 40));
      if (buyNow) router.push("/checkout");
      else router.push("/cart");
    } catch (e: any) {
      setNotice(e?.message || "Failed to add to cart");
      toast.error("Couldn't add to cart", e?.message || "Try again");
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = async () => {
    try {
      if (wished) {
        await removeWish(resolvedSku);
        toast.info("Removed from wishlist");
      } else {
        await addWish({ productId: product._id, sku: resolvedSku });
        toast.success("Saved to wishlist");
      }
    } catch (e: any) {
      toast.error("Wishlist update failed", e?.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400 mb-5 overflow-x-auto scrollbar-none" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors shrink-0">Home</Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        {product.categoryId && (
          <>
            <Link href={`/category/${product.categoryId.slug}`} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors shrink-0">
              {product.categoryId.name}
            </Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
          </>
        )}
        <span className="text-surface-900 dark:text-surface-100 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery */}
        <ProductGallery images={product.images} />

        {/* Product Info */}
        <div className="pb-24 lg:pb-0">
          {/* Brand + badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {product.brand && (
              <Link href={`/brand/${product.brand.slug}`} className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                {product.brand.name}
              </Link>
            )}
            {discount > 0 && <Badge variant="danger" size="md">-{discount}% Off</Badge>}
            {product.isBestseller && <Badge variant="info" size="md">Bestseller</Badge>}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 mb-2 tracking-tight leading-snug">
            {product.name}
          </h1>
          <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed mb-4">{product.shortDescription}</p>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="price text-2xl sm:text-3xl">{formatPrice(currentPrice)}</span>
            {product.salePrice && product.basePrice && (
              <span className="text-base text-surface-400 dark:text-surface-500 line-through">{formatPrice(product.basePrice)}</span>
            )}
            {discount > 0 && (
              <Badge variant="success" size="md">Save {discount}%</Badge>
            )}
          </div>

          {/* Delivery ETA */}
          <div className="flex items-center gap-2 mb-4 text-sm text-surface-700 dark:text-surface-300">
            <Truck className="w-4 h-4 text-green-600" />
            <span>Delivery by {new Date(Date.now() + deliveryDays * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>

          {/* Rating */}
          {product.averageRating > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < Math.round(product.averageRating) ? "text-warning-400" : "text-surface-200 dark:text-surface-700"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-surface-600 dark:text-surface-400">
                {product.averageRating} ({product.totalReviews} reviews)
              </span>
            </div>
          )}

          {/* Variants */}
          {product.hasVariants && (
            <div className="mb-5">
              <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-3 text-sm">Select Options</h2>
              <VariantSelector
                variants={product.variants}
                variantNames={variantNames}
                onSelect={setSelectedSku}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-3 mb-5">
            <label className="font-semibold text-surface-900 dark:text-surface-100 text-sm">Quantity</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-lg"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-12 text-center font-semibold tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-lg"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          {notice && (
            <div className="mb-3 p-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-xl text-warning-700 dark:text-warning-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {notice}
            </div>
          )}

          {/* Desktop actions */}
          <div className="hidden lg:block">
            <div className="flex gap-3 mb-3">
              <Button onClick={() => handleAddToCart(false)} isLoading={isAdding} className="flex-1" size="lg">
                <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
              </Button>
              <Button variant="outline" size="lg" className="px-4" onClick={handleWishlist} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}>
                <Heart className={`w-5 h-5 ${wished ? "fill-danger-500 text-danger-500" : ""}`} />
              </Button>
            </div>
            <Button onClick={() => handleAddToCart(true)} isLoading={isAdding} variant="outline" className="w-full mb-6" size="lg">
              Buy Now
            </Button>
          </div>

          {/* Feature badges */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Truck, label: "Free Shipping", sub: "On orders over ₹499" },
              { icon: Shield, label: "Secure Payment", sub: "PhonePe / COD" },
              { icon: Package, label: `${product.returnPolicyDays}-Day Returns`, sub: "Easy returns" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center p-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
                <f.icon className="w-5 h-5 text-brand-600 dark:text-brand-400 mb-1.5" />
                <span className="text-xs font-semibold text-surface-900 dark:text-surface-100 leading-tight">{f.label}</span>
                <span className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5">{f.sub}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="border-t border-surface-200 dark:border-surface-800 pt-5">
            <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-3 text-sm">Product Description</h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          {/* Specifications */}
          {product.specifications.length > 0 && (
            <div className="border-t border-surface-200 dark:border-surface-800 pt-5 mt-5">
              <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-3 text-sm">Specifications</h2>
              <div className="space-y-2">
                {product.specifications.map((spec, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-surface-100 dark:border-surface-800 last:border-0">
                    <span className="text-surface-500 dark:text-surface-400">{spec.group}: {spec.key}</span>
                    <span className="font-medium text-surface-900 dark:text-surface-100">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky mobile add-to-cart */}
      <div className="lg:hidden fixed bottom-[60px] left-0 right-0 z-30 bg-white/95 dark:bg-surface-950/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-800 px-4 py-3 flex items-center gap-3 pb-safe">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-surface-500 dark:text-surface-400 truncate">{product.name}</p>
          <p className="font-bold text-lg price">{formatPrice(currentPrice)}</p>
        </div>
        <Button onClick={() => handleAddToCart(false)} isLoading={isAdding} size="lg" className="shrink-0">
          <ShoppingCart className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>
    </div>
  );
}
