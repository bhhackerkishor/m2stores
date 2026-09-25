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
  Shield,
  BadgeCheck,
  Clock,
  CreditCard,
  Lock,
  Star,
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
    <div className="w-full h-full min-h-[320px] rounded-[var(--radius-lg)] bg-surface-200/60 dark:bg-surface-800/60 animate-pulse border border-surface-300/40 dark:border-surface-700/40 flex flex-col justify-between p-6">
      <div className="space-y-3">
        <div className="h-6 w-32 bg-surface-300 dark:bg-surface-700 rounded-full" />
        <div className="h-8 w-3/4 bg-surface-300 dark:bg-surface-700 rounded-[var(--radius-sm)]" />
        <div className="h-4 w-1/2 bg-surface-300 dark:bg-surface-700 rounded-[var(--radius-sm)]" />
      </div>
      <div className="h-10 w-36 bg-surface-300 dark:bg-surface-700 rounded-[var(--radius-sm)]" />
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
  const deliveryDays = storeSettings?.codDaysCal ?? 3;

  return (
    <div className="min-h-dvh bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300 antialiased selection:bg-brand-500 selection:text-white">
      {/* Top Banner Announcement Strip — a thin marigold edge ties it to the ticket motif below */}
      <div className="bg-brand-950 text-brand-200 text-[11px] sm:text-xs py-2.5 px-4 text-center font-medium tracking-wide border-b-2 border-warning-500/70 flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
        </span>
        <span>Express Pan-India Delivery within 2–4 Business Days | Cash on Delivery Available</span>
      </div>

      {/* Hero Section — a flat ink panel with a receipt-paper texture, built around a torn-coupon device rather than a floating stock photo */}
      <section className="relative overflow-hidden bg-brand-950 text-white py-14 sm:py-20 lg:py-24">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            {/* Left Column - Hero Dynamic Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-warning-300">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-400 shrink-0" />
                {hero?.title || "Grand Summer Sale"}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-balance">
                {hero?.subtitle || "Up to 50% Off on Electronics & Fashion"}
              </h1>

              <p className="text-brand-100/90 text-sm sm:text-base lg:text-lg font-normal max-w-xl leading-relaxed text-pretty">
                Shop 100% genuine products with PhonePe instant checkout, Cash on Delivery, hassle-free 7-day returns, and dedicated customer support.
              </p>

              {/* Search Bar — styled like a punched coupon stub, cut into the ink background on either side */}
              <div className="relative max-w-xl pt-2">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-950 z-10"
                  aria-hidden="true"
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-950 z-10"
                  aria-hidden="true"
                />
                <SearchAutocomplete />
              </div>

              {/* Trust Value Props — set like line items on a receipt, dashed dividers instead of a checkmark row */}
              <div className="pt-3 flex flex-wrap items-center text-xs sm:text-sm font-semibold text-brand-200/90">
                <div className="flex items-center gap-2 pr-5">
                  <CheckCircle2 className="w-4 h-4 text-accent-400 shrink-0" />
                  <span>Free shipping over ₹{freeShippingThreshold}</span>
                </div>
                <div className="flex items-center gap-2 px-5 border-l border-dashed border-brand-700">
                  <CheckCircle2 className="w-4 h-4 text-accent-400 shrink-0" />
                  <span>7-day easy returns</span>
                </div>
                <div className="flex items-center gap-2 pl-5 border-l border-dashed border-brand-700">
                  <CheckCircle2 className="w-4 h-4 text-accent-400 shrink-0" />
                  <span>100% genuine guarantee</span>
                </div>
              </div>
            </div>

            {/* Right Column — either the CMS hero banner in a clipped tag frame, or a stack of real category tags */}
            <div className="lg:col-span-5 hidden lg:block">
              <Suspense fallback={<BannerSkeleton />}>
                {hero?.image?.url ? (
                  <div
                    className="relative w-full aspect-[4/3] overflow-hidden shadow-2xl border border-white/10 group transition-all duration-500 hover:scale-[1.01] [clip-path:polygon(0_0,calc(100%-28px)_0,100%_28px,100%_100%,0_100%)]"
                  >
                    <Image
                      src={hero.image.url}
                      alt={hero.title || "Hero Banner"}
                      fill
                      priority
                       unoptimized 
                      sizes="(max-width: 1200px) 100vw, 500px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-950/10 to-transparent" />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-warning-500 text-brand-950 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-[var(--radius-xs)]">
                      Featured
                    </span>
                    {hero.link && (
                      <div className="absolute bottom-6 left-6 right-6">
                        <Link
                          href={hero.link}
                          className="inline-flex items-center gap-2 text-xs font-bold bg-white hover:bg-brand-50 text-surface-950 px-4 py-2.5 rounded-[var(--radius-sm)] shadow-lg transition-all duration-200 hover:gap-3"
                        >
                          <span>Explore deals</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categories.slice(0, 3).map((category: any, i: number) => (
                      <Link
                        key={String(category._id)}
                        href={`/category/${category.slug}`}
                        style={{ transform: `rotate(${i === 0 ? "-1.5deg" : i === 1 ? "1deg" : "-0.5deg"})` }}
                        className="group relative flex items-center justify-between gap-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 px-5 py-4 transition-all duration-300 [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)]"
                      >
                        <span
                          className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-warning-400"
                          aria-hidden="true"
                        />
                        <div className="pl-3">
                          <p className="text-[10px] uppercase tracking-wide text-brand-300 font-semibold">
                            Shop the category
                          </p>
                          <h3 className="font-display text-lg font-bold text-white">{category.name}</h3>
                        </div>
                        <ArrowRight className="w-4 h-4 text-brand-300 group-hover:translate-x-1 group-hover:text-warning-400 transition-all shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Banner Carousel */}
      <BannerCarousel />

      {/* Brand Value Pillars — Trust Bar */}
      <section className="bg-white dark:bg-surface-900 border-y border-surface-200/80 dark:border-surface-800 py-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-[var(--radius-md)] bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-950/40 dark:to-accent-900/20 text-accent-600 border border-accent-200/60 dark:border-accent-800/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent-100">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-surface-900 dark:text-surface-100">Free Express Delivery</h4>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  On orders over ₹{freeShippingThreshold} · Pan-India
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-[var(--radius-md)] bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950/40 dark:to-brand-900/20 text-brand-600 border border-brand-200/60 dark:border-brand-800/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-brand-100">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-surface-900 dark:text-surface-100">100% Genuine Products</h4>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Verified sellers & brand authorized
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-[var(--radius-md)] bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-950/40 dark:to-warning-900/20 text-warning-600 border border-warning-200/60 dark:border-warning-800/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-warning-100">
                <RotateCcw className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-surface-900 dark:text-surface-100">7-Day Easy Returns</h4>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Hassle-free replacement or full refund
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-[var(--radius-md)] bg-gradient-to-br from-danger-50 to-danger-100 dark:from-danger-950/40 dark:to-danger-900/20 text-danger-600 border border-danger-200/60 dark:border-danger-800/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-danger-100">
                <Headphones className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-surface-900 dark:text-surface-100">24/7 Customer Support</h4>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Dedicated help for every order
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badge Strip */}
      <section className="bg-surface-50 dark:bg-surface-950 py-6 border-b border-surface-100 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-surface-500 dark:text-surface-400">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent-600" />
              <span className="font-semibold">SSL Encrypted Checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span className="font-semibold">PhonePe Secured Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-warning-600" />
              <span className="font-semibold">GST Invoice Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              <span className="font-semibold">Same Day Dispatch</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-warning-500 fill-warning-500" />
              <span className="font-semibold">4.8★ Customer Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Shop By Category Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <section aria-label="Shop by category">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
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
                             unoptimized 
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
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
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
                className="group relative overflow-hidden rounded-[var(--radius-lg)] p-6 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex flex-col h-full justify-between space-y-4 relative z-10">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-md">
                      {String(offer.type).replace(/_/g, " ")}
                    </span>
                    <h3 className="font-display text-lg font-bold mt-2 group-hover:translate-x-1 transition-transform duration-200">
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
            className="group relative block w-full h-48 sm:h-64 rounded-[var(--radius-lg)] overflow-hidden shadow-xl border border-surface-200 dark:border-surface-800"
          >
            <Image
              src={promo.image.url}
              alt={promo.title}
              fill
               unoptimized 
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-6 sm:p-10 flex flex-col justify-center max-w-xl text-white">
              <span className="text-xs font-bold uppercase tracking-widest text-warning-400 mb-2">
                Special Promotion
              </span>
              <h3 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">{promo.title}</h3>
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
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
                Deals Under ₹500
              </h2>
              <Link href="/shop?maxPrice=500" className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group">
                <span>View All</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {(under500 as any).items.slice(0, 4).map((product: any) => (
                <ProductCard key={String(product._id)} product={JSON.parse(JSON.stringify(product))} deliveryDays={deliveryDays} />
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
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
                Deals Under ₹1000
              </h2>
              <Link href="/shop?maxPrice=1000" className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline group">
                <span>View All</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {(under1000 as any).items.slice(0, 4).map((product: any) => (
                <ProductCard key={String(product._id)} product={JSON.parse(JSON.stringify(product))} deliveryDays={deliveryDays} />
              ))}
            </div>
          </section>
        </FadeIn>
      )}

      {/* Trending Products Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="Trending products">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <span>Trending Now</span>
              <Flame className="w-6 h-6 text-warning-500 fill-warning-500 animate-pulse" />
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
                deliveryDays={deliveryDays}
              />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Bestseller Products Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="Bestsellers">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <span>Bestsellers</span>
              <Trophy className="w-6 h-6 text-warning-400" />
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
                deliveryDays={deliveryDays}
              />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Featured Products Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="Featured products">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-2">
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
                deliveryDays={deliveryDays}
              />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Customer Trust & Reviews Section */}
      <section className="bg-surface-100 dark:bg-surface-900/60 border-t border-surface-200 dark:border-surface-800 py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600 bg-brand-50 dark:bg-brand-950/80 border border-brand-200/60 dark:border-brand-800/40 px-4 py-1.5 rounded-full mb-4">
              <BadgeCheck className="w-3.5 h-3.5" />
              Verified Reviews
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50">
              Trusted by Shoppers Across India
            </h2>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-2">
              Every review is from a verified purchase — no fake reviews, no manipulation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-surface-900 rounded-[var(--radius-md)] border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 text-warning-400 mb-3 text-sm">
                ★★★★★
              </div>
              <p className="text-xs sm:text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                &ldquo;Super fast delivery to Chennai! The product was genuine and packed securely. Paid via PhonePe smoothly. Will order again!&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold text-xs">RK</div>
                <div>
                  <div className="font-bold text-xs text-surface-900 dark:text-surface-100">Rajesh K.</div>
                  <div className="text-[10px] text-accent-600 font-semibold flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified Buyer</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-surface-900 rounded-[var(--radius-md)] border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 text-warning-400 mb-3 text-sm">
                ★★★★★
              </div>
              <p className="text-xs sm:text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                &ldquo;Easy return process when I ordered the wrong size. Support team resolved it within 24 hours. Very professional!&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center text-danger-600 font-bold text-xs">PS</div>
                <div>
                  <div className="font-bold text-xs text-surface-900 dark:text-surface-100">Priya S.</div>
                  <div className="text-[10px] text-accent-600 font-semibold flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified Buyer</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-surface-900 rounded-[var(--radius-md)] border border-surface-200 dark:border-surface-800 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 text-warning-400 mb-3 text-sm">
                ★★★★★
              </div>
              <p className="text-xs sm:text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                &ldquo;Best prices compared to Amazon/Flipkart for the same genuine products. COD option is a plus. Highly recommended!&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 font-bold text-xs">AV</div>
                <div>
                  <div className="font-bold text-xs text-surface-900 dark:text-surface-100">Amit V.</div>
                  <div className="text-[10px] text-accent-600 font-semibold flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified Buyer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="font-display text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50">50K+</div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Happy Customers</div>
            </div>
            <div className="p-4">
              <div className="font-display text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50">4.8★</div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Average Rating</div>
            </div>
            <div className="p-4">
              <div className="font-display text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50">99%</div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">On-Time Delivery</div>
            </div>
            <div className="p-4">
              <div className="font-display text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50">100%</div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Genuine Products</div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup Block */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 rounded-[var(--radius-lg)] p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 max-w-xl text-center md:text-left relative z-10">
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
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
              className="px-4 py-3 rounded-[var(--radius-sm)] bg-white/10 text-white placeholder-brand-200/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white text-xs sm:text-sm w-full backdrop-blur-md"
            />
            <button className="px-6 py-3 bg-white text-brand-950 font-bold rounded-[var(--radius-sm)] text-xs sm:text-sm hover:bg-brand-50 transition-all duration-200 shrink-0 shadow-lg hover:shadow-white/20">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}