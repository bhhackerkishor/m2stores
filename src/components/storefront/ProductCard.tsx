"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Heart, ShoppingCart, Check, Eye, Sparkles, Loader2, AlertCircle } from "lucide-react";
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
  deliveryDays?: number;
}

export function ProductCard({ product, deliveryDays = 3 }: ProductCardProps) {
  const { add } = useCart();
  const { add: addWish, remove: removeWish, isWished } = useWishlist();
  const toast = useToast();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Fallback structural identification mechanics
  const defaultSku =
    product.baseSKU ||
    product.variants?.find((v) => v.isActive)?.sku ||
    product.slug.toUpperCase();

  const wishlisted = isWished(defaultSku);

  // Meta string resolutions
  const brandName =
    product.brand?.name ||
    (product.brandId && typeof product.brandId === "object"
      ? product.brandId.name
      : null);

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
      toast.success(
        "Added to cart",
        `${product.name.substring(0, 40)}${product.name.length > 40 ? "..." : ""}`
      );
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
      // Fail silently
    }
  };

  // Delivery date calculation
  const deliveryDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + deliveryDays);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  })();

  return (
    <div className="group relative bg-white dark:bg-surface-900 border border-surface-200/70 dark:border-surface-800/80 rounded-2xl transition-all duration-500 ease-out hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-full w-full">
      
      {/* 1. Visual Workspace Media Container */}
      <div className="relative aspect-[4/5] w-full bg-surface-50 dark:bg-surface-950 overflow-hidden select-none shrink-0">
        <Link href={`/product/${product.slug}`} className="absolute inset-0 block z-10">
          {!imageError ? (
            <Image
              src={product.images?.[0]?.url || "https://placehold.co/600x750"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              className={`object-cover object-center w-full h-full transition-all duration-700 ease-out group-hover:scale-[1.04] ${
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-600">
              <AlertCircle className="w-8 h-8 stroke-[1.5]" />
              <span className="text-[10px] uppercase font-bold tracking-widest">
                Image Unavailable
              </span>
            </div>
          )}

          {/* Shimmer while loading */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 dark:from-surface-900 dark:via-surface-800 dark:to-surface-900 animate-pulse" />
          )}
        </Link>

        {/* Editorial Premium Content Overlays */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20 pointer-events-none">
          {discount > 0 && (
            <span className="bg-surface-950 text-white dark:bg-white dark:text-surface-950 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md shadow-md">
              {discount}% OFF
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 fill-current" /> Bestseller
            </span>
          )}
          {product.isTrending && !product.isBestseller && (
            <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded-md backdrop-blur-md">
              Trending
            </span>
          )}
        </div>

        {/* Floating Minimal Wishlist Trigger */}
        <button
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 active:scale-90 z-20 border shadow-sm ${
            wishlisted
              ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20"
              : "bg-white/80 dark:bg-surface-900/80 border-surface-200/40 dark:border-surface-800/40 text-surface-600 dark:text-surface-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-surface-900"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-transform duration-300 ${
              wishlisted ? "fill-white scale-110" : "group-hover:scale-110"
            }`}
          />
        </button>

        {/* Minimalist Premium Hover Bottom Bar Quick View */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/40 via-black/10 to-transparent flex items-end justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out z-20 pointer-events-none">
          <span className="w-full bg-white text-surface-950 text-xs font-bold py-2 rounded-xl shadow-xl flex items-center justify-center gap-2 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500 delay-75">
            <Eye className="w-3.5 h-3.5 stroke-[2.5]" /> Quick View
          </span>
        </div>
      </div>

      {/* 2. Structural Copy and Actions Content Window */}
      <div className="p-4 flex flex-col flex-grow justify-between bg-white dark:bg-surface-900">
        <div className="space-y-1">
          {/* Accent Hierarchy Brand Flag */}
          {brandName ? (
            <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest truncate">
              {brandName}
            </p>
          ) : (
            <p className="text-[10px] text-surface-400 dark:text-surface-500 font-bold uppercase tracking-widest truncate">
              M2STORES VERIFIED
            </p>
          )}

          {/* Clean Editorial Title */}
          <Link href={`/product/${product.slug}`} className="block group/title">
            <h3 className="font-medium text-sm sm:text-base text-surface-800 dark:text-surface-100 line-clamp-2 leading-tight tracking-tight group-hover/title:text-brand-600 dark:group-hover/title:text-brand-400 transition-colors duration-200 min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>

          {/* Luxury Minimalist Star Meta Grid */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {product.averageRating ? (
              <>
                <div className="flex items-center gap-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md text-[11px] font-bold">
                  <span>{product.averageRating.toFixed(1)}</span>
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-[11px] text-surface-400 font-medium">
                  ({product.totalReviews || 0} reviews)
                </span>
              </>
            ) : (
              <span className="text-[11px] text-surface-400 font-medium tracking-wide">
                New Arrival
              </span>
            )}
          </div>
        </div>

        {/* 3. Price, Shipping, and Action Matrix Base */}
        <div className="mt-3 space-y-3">
          {/* Micro-Delivery Banner Context Line */}
          <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">
            Express Delivery by{" "}
            <span className="text-surface-800 dark:text-surface-200 font-semibold">
              {deliveryDate}
            </span>
          </p>

          {/* Structural Custom Typography Price Frame + CTA */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              {discount > 0 && (
                <span className="text-xs text-surface-400 line-through">
                  {formatPrice(product.basePrice)}
                </span>
              )}
              <span className="text-base font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                {formatPrice(price)}
              </span>
            </div>

            {/* Smart Interaction Micro Cart CTA */}
            <button
              onClick={handleQuickAdd}
              disabled={adding}
              aria-label={added ? "Added to cart" : "Quick add to cart"}
              className={`relative overflow-hidden h-9 px-4 rounded-xl font-bold text-xs tracking-wide uppercase transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5 select-none shrink-0 ${
                added
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                  : adding
                  ? "bg-surface-100 dark:bg-surface-800 text-surface-400 cursor-not-allowed"
                  : "bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-950 hover:bg-brand-600 dark:hover:bg-brand-500 hover:text-white dark:hover:text-white"
              }`}
            >
              {adding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}