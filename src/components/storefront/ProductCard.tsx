"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Heart, ShoppingCart, Check, Eye } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useState } from "react";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string; publicId: string; isPrimary: boolean }[];
    brandId?: { name: string } | null;
    brand?: { name: string };
    basePrice: number;
    salePrice?: number;
    baseSKU?: string;
    hasVariants?: boolean;
    variants?: Array<{ sku: string; isActive: boolean }>;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isTrending?: boolean;
    averageRating?: number;
    totalReviews?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { add } = useCart();
  const { add: addWish, remove: removeWish, isWished } = useWishlist();
  const toast = useToast();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const defaultSku =
    product.baseSKU || product.variants?.find((v) => v.isActive)?.sku || product.slug.toUpperCase();
  const wishlisted = isWished(defaultSku);

  const brandName = product.brand?.name || (product.brandId && typeof product.brandId === "object" ? product.brandId.name : null);
  const price = product.salePrice || product.basePrice;
  const discount =
    product.basePrice && product.salePrice && product.salePrice < product.basePrice
      ? Math.round((1 - product.salePrice / product.basePrice) * 100)
      : 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding || added) return;
    setAdding(true);
    try {
      await add({ productId: product._id, sku: defaultSku, quantity: 1 });
      setAdded(true);
      toast.success("Added to cart", `${product.name.substring(0, 40)}${product.name.length > 40 ? "..." : ""}`);
      setTimeout(() => setAdded(false), 2000);
    } catch (err: any) {
      toast.error("Couldn't add to cart", err?.message || "Try again");
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (wishlisted) {
        await removeWish(defaultSku);
        toast.info("Removed from wishlist");
      } else {
        await addWish({ productId: product._id, sku: defaultSku });
        toast.success("Saved to wishlist");
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="group relative bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      {/* Image */}
      <Link href={`/product/${product.slug}`} className="block relative overflow-hidden bg-surface-100 dark:bg-surface-800">
        <div className="aspect-square relative">
          {!imageError ? (
            <Image
              src={product.images?.[0]?.url || "https://via.placeholder.com/400x400?text=No+Image"}
              alt={product.name}
              width={400}
              height={400}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-100 dark:bg-surface-800 text-surface-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
            </div>
          )}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 skeleton" />
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="bg-danger-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              -{discount}%
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-brand-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              Bestseller
            </span>
          )}
          {product.isTrending && !product.isBestseller && (
            <span className="bg-accent-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              Trending
            </span>
          )}
        </div>

        {/* Quick view on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
            <Eye className="w-3.5 h-3.5" /> Quick View
          </span>
        </div>
      </Link>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-150 ${
          wishlisted
            ? "bg-danger-500 text-white shadow-danger-200"
            : "bg-white/90 dark:bg-surface-800/90 text-surface-500 hover:text-danger-500 hover:bg-white dark:hover:bg-surface-700"
        }`}
      >
        <Heart className={`w-4 h-4 ${wishlisted ? "fill-white" : ""}`} />
      </button>

      {/* Content */}
      <div className="p-3.5">
        {brandName && (
          <p className="text-[11px] text-surface-500 dark:text-surface-400 font-semibold uppercase tracking-wider truncate mb-0.5">
            {brandName}
          </p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors min-h-[2.5rem] leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1.5">
          {product.averageRating ? (
            <>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.averageRating!) ? "text-warning-400" : "text-surface-200 dark:text-surface-700"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-[11px] text-surface-400">({product.totalReviews || 0})</span>
            </>
          ) : (
            <span className="text-[11px] text-surface-300 dark:text-surface-600">No reviews</span>
          )}
        </div>

        {/* Price + Add to cart */}
        <div className="flex items-end justify-between mt-2.5">
          <div>
            <span className="price text-lg">{formatPrice(price)}</span>
            {discount > 0 && (
              <span className="text-xs text-surface-400 dark:text-surface-500 line-through ml-1.5">{formatPrice(product.basePrice)}</span>
            )}
          </div>
          <button
            onClick={handleQuickAdd}
            disabled={adding}
            aria-label={added ? "Added to cart" : "Quick add to cart"}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
              added
                ? "bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400"
                : adding
                ? "bg-surface-100 dark:bg-surface-800 text-surface-400"
                : "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white"
            }`}
          >
            {added ? (
              <Check className="w-4 h-4" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
