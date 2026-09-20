import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Tag,
  Flame,
  Trophy,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

import { ProductCard } from "@/components/storefront/ProductCard";
import { SearchAutocomplete } from "@/components/storefront/SearchAutocomplete";
import { FadeIn } from "@/components/shared/FadeIn";
import BannerCarousel from "@/components/home/BannerCarousel";
import { CatalogService } from "@/services/catalog.service";
import { OfferService } from "@/services/offer.service";
import { Banner } from "@/models/Banner";
import { Setting } from "@/models/Setting";
import { connectDB } from "@/lib/db";

export const metadata = {
  title: "M2Stores — India's Premier Online Marketplace",
  description:
    "Shop verified electronics, fashion, home decor, and lifestyle products with instant PhonePe payments, COD, and express Pan-India shipping.",
};

// Reusable Loading Skeleton for Banner & Sections
function BannerSkeleton() {
  return (
    <div className="w-full h-full min-h-[320px] rounded-2xl bg-surface-200/60 dark:bg-surface-800/60 animate-pulse border border-surface-300/40 dark:border-surface-700/40 flex flex-col justify-between p-6">
      <div className="space-y-3">
        <div className="h-6 w-32 bg-surface-300 dark:bg-surface-700 rounded-full" />
        <div className="h-8 w-3/4 bg-surface-300 dark:bg-surface-700 rounded-lg" />
        <div className="h-4 w-1/2 bg-surface-300 dark:bg-surface-700 rounded-lg" />
      </div>
      <div className="h-10 w-36 bg-surface-300 dark:bg-surface-700 rounded-xl" />
    </div>
  );
}

export default async function HomePage() {
  await connectDB();
  const currentDate = new Date();

  // Fetch active banners dynamically filtering start and expiry dates
  const [
    featured,
    trending,
    bestsellers,
    categories,
    heroBanners,
    promoBanners,
    offers,
    settings,
    under500,
    under1000,
  ] = await Promise.all([
    CatalogService.listProducts({ isFeatured: true, limit: 8 }),
    CatalogService.listProducts({ isTrending: true, limit: 8 }),
    CatalogService.listProducts({ isBestseller: true, limit: 8 }),
    CatalogService.getCategories(true),
    Banner.find({
      isActive: true,
      type: "HERO",
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: currentDate } }] },
        { $or: [{ expiryDate: { $exists: false } }, { expiryDate: { $gte: currentDate } }] },
      ],
    })
      .sort({ ordering: 1 })
      .limit(3)
      .lean()
      .catch(() => []),
    Banner.find({
      isActive: true,
      type: "PROMOTIONAL",
      $and: [
    { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: currentDate } }] },
    { $or: [{ expiryDate: { $exists: false } }, { expiryDate: { $gte: currentDate } }] },
  ],
    })
      .sort({ ordering: 1 })
      .limit(2)
      .lean()
      .catch(() => []),
    OfferService.activeOffers().catch(() => []),
    Setting.findOne().lean().catch(() => null),
    CatalogService.listProducts({ maxPrice: 499, limit: 8 }),
    CatalogService.listProducts({ maxPrice: 999, limit: 8 }),
  ]);

  const hero = (heroBanners as any[])[0];
  const promo = (promoBanners as any[])[0];
  const storeSettings = settings as any;
  const freeShippingThreshold = storeSettings?.freeShippingThreshold || 499;

  return (
    <div className="min-h-dvh bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300 antialiased selection:bg-brand-500 selection:text-white">
      {/* Top Banner Announcement Strip */}
      <div className="bg-brand-950 text-brand-200 text-[11px] sm:text-xs py-2.5 px-4 text-center font-medium tracking-wide border-b border-brand-800/40 flex items-center justify-center gap-2 shadow-inner">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>Express Pan-India Delivery within 2–4 Business Days | Cash on Delivery Available</span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-surface-950 text-white py-14 sm:py-20 lg:py-24">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06)_0%,transparent_65%)] pointer-events-none"
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column - Hero Dynamic Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-300 bg-brand-900/90 border border-brand-700/60 px-4 py-1.5 rounded-full backdrop-blur-md shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                {hero?.title || "Grand Summer Sale"}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-balance">
                {hero?.subtitle || "Up to 50% Off on Electronics & Fashion"}
              </h1>

              <p className="text-brand-100/90 text-sm sm:text-base lg:text-lg font-normal max-w-xl leading-relaxed text-pretty">
                Shop 100% genuine products with PhonePe instant checkout, Cash on Delivery, hassle-free 7-day returns, and dedicated customer support.
              </p>

              {/* Search Bar Integration */}
              <div className="max-w-xl pt-2">
                <SearchAutocomplete />
              </div>

              {/* Trust Value Props */}
              <div className="pt-2 flex flex-wrap items-center gap-5 sm:gap-6 text-xs sm:text-sm font-semibold text-brand-200/90">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Free Shipping over ₹{freeShippingThreshold}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>7-Day Easy Returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Genuine Guarantee</span>
                </div>
              </div>
            </div>

            {/* Right Column - Dynamic Banner Image with Lazy-loading Skeleton */}
            <div className="lg:col-span-5 hidden lg:block">
              <Suspense fallback={<BannerSkeleton />}>
                {hero?.image?.url ? (
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group transition-all duration-500 hover:shadow-brand-500/20 hover:scale-[1.01]">
                    <Image
                      src={hero.image.url}
                      alt={hero.title || "Hero Banner"}
                      fill
                      priority
                      sizes="(max-width: 1200px) 100vw, 500px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                    {hero.link && (
                      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
                        <Link
                          href={hero.link}
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/90 hover:bg-white text-surface-950 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all duration-200 hover:gap-3"
                        >
                          <span>Explore Deals</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative mx-auto w-full max-w-md aspect-square rounded-2xl bg-gradient-to-tr from-brand-600/30 to-brand-400/10 border border-white/10 p-4 shadow-2xl backdrop-blur-sm">
                    <div className="w-full h-full rounded-xl bg-surface-900/70 border border-white/10 p-6 flex flex-col justify-between">
                      <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                          <Tag className="w-3.5 h-3.5" />
                          Featured Collection
                        </span>
                        <h3 className="text-2xl font-bold text-white">Smart Electronics & Wearables</h3>
                        <p className="text-xs text-brand-200/80 leading-relaxed">
                          Upgrade your everyday setup with original certified tech and accessories.
                        </p>
                      </div>
                      <Link
                        href="/shop"
                        className="inline-flex items-center justify-center gap-2 font-bold text-sm bg-brand-500 hover:bg-brand-400 text-white py-3 px-6 rounded-xl transition-all duration-200 shadow-lg group hover:shadow-brand-500/30"
                      >
                        <span>Explore Catalog</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Banner Carousel */}
      <BannerCarousel />

      {/* Brand Value Pillars */}
      <section className="bg-white dark:bg-surface-900 border-y border-surface-200/80 dark:border-surface-800 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-surface-900 dark:text-surface-100">Fast Shipping</h4>
              <p className="text-[11px] sm:text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Free delivery on orders over ₹{freeShippingThreshold}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-surface-900 dark:text-surface-100">Secure Payments</h4>
              <p className="text-[11px] sm:text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                PhonePe, UPI, Cards & COD supported
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-surface-900 dark:text-surface-100">7-Day Return Policy</h4>
              <p className="text-[11px] sm:text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Hassle-free replacement or refund
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-surface-900 dark:text-surface-100">Customer Support</h4>
              <p className="text-[11px] sm:text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Dedicated assistance for all orders
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop By Category Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <section aria-label="Shop by category">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                Shop by Category
              </h2>
              <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
                Explore handpicked collections across all departments
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group"
            >
              <span>View All Categories</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 sm:gap-6">
            {categories.slice(0, 6).map((category: any) => {
              const categoryImg = category.image || category.imageUrl;

              return (
                <Link
                  key={String(category._id)}
                  href={`/category/${category.slug}`}
                  className="group flex flex-col items-center text-center"
                >
                  <div className="relative mb-3.5 sm:mb-4 w-20 h-[88px] sm:w-24 sm:h-[104px]">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-full bg-surface-100 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-700 shadow-sm transition-all duration-300 ease-out group-hover:scale-105 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 group-hover:border-brand-200 dark:group-hover:border-brand-800" />
                    <div className="absolute inset-x-0 top-0 bottom-2 flex items-end justify-center transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.06]">
                      {categoryImg ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={categoryImg}
                            alt={category.name}
                            fill
                            sizes="(max-width: 640px) 80px, 96px"
                            className="object-contain drop-shadow-md"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-100 dark:bg-brand-900/60 flex items-center justify-center text-xl sm:text-2xl font-bold text-brand-600 dark:text-brand-300 shadow-inner">
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] sm:text-sm font-semibold tracking-tight text-surface-800 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200 line-clamp-2 max-w-[100px] sm:max-w-[120px]">
                    {category.name}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </FadeIn>

      {/* Active Offers & Promotional Banner Section */}
      {(offers as any[]).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <span>Exclusive Deals & Offers</span>
                <Tag className="w-6 h-6 text-brand-500 animate-bounce" />
              </h2>
              <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                Discounts automatically applied at checkout
              </p>
            </div>
            <Link
              href="/coupons"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group"
            >
              <span>All Coupons</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(offers as any[]).slice(0, 3).map((offer) => (
              <Link
                key={String(offer._id)}
                href="/coupons"
                className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-600 text-white shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex flex-col h-full justify-between space-y-4 relative z-10">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-md">
                      {String(offer.type).replace(/_/g, " ")}
                    </span>
                    <h3 className="text-lg font-bold mt-2 group-hover:translate-x-1 transition-transform duration-200">
                      {offer.title}
                    </h3>
                  </div>
                  <p className="text-xs text-white/80 font-medium">Auto-applies at checkout</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Mid-Page Promotional Banner */}
      {promo && (
        <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href={promo.link || "/shop"}
            className="group relative block w-full h-48 sm:h-64 rounded-3xl overflow-hidden shadow-xl border border-surface-200 dark:border-surface-800"
          >
            <Image
              src={promo.image.url}
              alt={promo.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-6 sm:p-10 flex flex-col justify-center max-w-xl text-white">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
                Special Promotion
              </span>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{promo.title}</h3>
              {promo.subtitle && <p className="text-xs sm:text-sm text-surface-200 mt-2 line-clamp-2">{promo.subtitle}</p>}
            </div>
          </Link>
        </FadeIn>
      )}

      {/* Deals Under ₹500 */}
      {(under500 as any).items?.length > 0 && (
        <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <section aria-label="Deals under 500">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                Deals Under ₹500
              </h2>
              <Link href="/shop?maxPrice=500" className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group">
                <span>View All</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {(under500 as any).items.slice(0, 4).map((product: any) => (
                <ProductCard key={String(product._id)} product={JSON.parse(JSON.stringify(product))} />
              ))}
            </div>
          </section>
        </FadeIn>
      )}

      {/* Deals Under ₹1000 */}
      {(under1000 as any).items?.length > 0 && (
        <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <section aria-label="Deals under 1000">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                Deals Under ₹1000
              </h2>
              <Link href="/shop?maxPrice=1000" className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group">
                <span>View All</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {(under1000 as any).items.slice(0, 4).map((product: any) => (
                <ProductCard key={String(product._id)} product={JSON.parse(JSON.stringify(product))} />
              ))}
            </div>
          </section>
        </FadeIn>
      )}

      {/* Trending Products Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="Trending products">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <span>Trending Now</span>
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500 animate-pulse" />
            </h2>
            <Link
              href="/shop?sort=popularity"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group"
            >
              <span>Explore All</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {trending.items.map((product: any) => (
              <ProductCard
                key={String(product._id)}
                product={JSON.parse(JSON.stringify(product))}
              />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Bestseller Products Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="Bestsellers">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <span>Bestsellers</span>
              <Trophy className="w-6 h-6 text-amber-400" />
            </h2>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group"
            >
              <span>Explore All</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {bestsellers.items.map((product: any) => (
              <ProductCard
                key={String(product._id)}
                product={JSON.parse(JSON.stringify(product))}
              />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Featured Products Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="Featured products">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <span>Featured Collections</span>
              <Sparkles className="w-6 h-6 text-brand-500" />
            </h2>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group"
            >
              <span>Explore All</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {featured.items.map((product: any) => (
              <ProductCard
                key={String(product._id)}
                product={JSON.parse(JSON.stringify(product))}
              />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Customer Trust & Reviews Section */}
      <section className="bg-surface-100 dark:bg-surface-900/60 border-t border-surface-200 dark:border-surface-800 py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-surface-50">
              Trusted by Shoppers Across India
            </h2>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-2">
              See what verified buyers have to say about their experience on M2Stores
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 text-amber-400 mb-3 text-sm">
                ★★★★★
              </div>
              <p className="text-xs sm:text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                "Super fast delivery to Chennai! The product was genuine and packed securely. Paid via PhonePe smoothly."
              </p>
              <div className="font-bold text-xs text-surface-900 dark:text-surface-100">
                — Rajesh K. <span className="font-normal text-surface-400">(Verified Buyer)</span>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 text-amber-400 mb-3 text-sm">
                ★★★★★
              </div>
              <p className="text-xs sm:text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                "Easy return process when I ordered the wrong size. Support team resolved it within 24 hours."
              </p>
              <div className="font-bold text-xs text-surface-900 dark:text-surface-100">
                — Priya S. <span className="font-normal text-surface-400">(Verified Buyer)</span>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 text-amber-400 mb-3 text-sm">
                ★★★★★
              </div>
              <p className="text-xs sm:text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                "Great prices compared to other marketplaces and genuine brand products. Highly recommended!"
              </p>
              <div className="font-bold text-xs text-surface-900 dark:text-surface-100">
                — Amit V. <span className="font-normal text-surface-400">(Verified Buyer)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup Block */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 max-w-xl text-center md:text-left relative z-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Get Exclusive Offers & Flash Deals
            </h3>
            <p className="text-xs sm:text-sm text-brand-100/80">
              Subscribe to receive weekly coupon codes and early access to upcoming sales directly in your inbox.
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 min-w-[300px] relative z-10">
            <input
              type="email"
              placeholder="Enter your email address"
              className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-brand-200/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white text-xs sm:text-sm w-full backdrop-blur-md"
            />
            <button className="px-6 py-3 bg-white text-brand-950 font-bold rounded-xl text-xs sm:text-sm hover:bg-brand-50 transition-all duration-200 shrink-0 shadow-lg hover:shadow-white/20">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}