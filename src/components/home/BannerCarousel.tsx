"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface Banner {
  _id: string;
  image: { url: string; publicId: string } | string;
  title: string;
  subtitle?: string;
  link?: string;
  linkType?: string;
  linkTarget?: string;
}

function BannerSkeleton() {
  return (
    <div className="relative w-full aspect-[2/1] sm:aspect-[2.5/1] md:aspect-[3/1] rounded-[var(--radius-lg)] bg-surface-200/60 dark:bg-surface-800/60 animate-pulse border border-surface-300/40 dark:border-surface-700/40 overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
        <div className="space-y-3">
          <div className="h-5 w-28 bg-surface-300 dark:bg-surface-700 rounded-full" />
          <div className="h-7 w-3/4 bg-surface-300 dark:bg-surface-700 rounded-[var(--radius-sm)]" />
          <div className="h-4 w-1/2 bg-surface-300 dark:bg-surface-700 rounded-[var(--radius-xs)]" />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-surface-300 dark:bg-surface-700" />
        ))}
      </div>
    </div>
  );
}

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [touching, setTouching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    fetch("/api/banners?type=HERO")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setBanners(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = banners.length;
  const goTo = useCallback((idx: number) => {
    if (total === 0) return;
    setActive(((idx % total) + total) % total);
    setDragOffset(0);
  }, [total]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Auto-advance
  useEffect(() => {
    if (total <= 1 || hovered || touching) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(next, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [total, hovered, touching, next]);

  // Touch / drag handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setTouching(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    setDragOffset(touchDeltaX.current * 0.3);
  };
  const onTouchEnd = () => {
    setTouching(false);
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0) next();
      else prev();
    }
    setDragOffset(0);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    setTouching(true);
    const onMouseMove = (ev: MouseEvent) => {
      touchDeltaX.current = ev.clientX - touchStartX.current;
      setDragOffset(touchDeltaX.current * 0.3);
    };
    const onMouseUp = () => {
      setTouching(false);
      if (Math.abs(touchDeltaX.current) > 50) {
        if (touchDeltaX.current < 0) next();
        else prev();
      }
      setDragOffset(0);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto my-3 px-2 sm:px-4">
        <BannerSkeleton />
      </div>
    );
  }

  if (total === 0) return null;

  const getImageSrc = (b: Banner): string => {
    if (typeof b.image === "string") return b.image;
    if (b.image?.url) return b.image.url;
    return "";
  };

  const getHref = (b: Banner): string => {
    if (!b.link) return "#";
    if (b.linkType === "PRODUCT") return `/product/${b.linkTarget || b.link}`;
    if (b.linkType === "CATEGORY") return `/category/${b.linkTarget || b.link}`;
    if (b.linkType === "PAGE") return `/${b.linkTarget || b.link}`;
    return b.link;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[1400px] mx-auto my-3 px-2 sm:px-4 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="region"
      aria-label="Promotional banners"
      aria-roledescription="carousel"
    >
      {/* Slides container */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] aspect-[2/1] sm:aspect-[2.5/1] md:aspect-[3/1] cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(calc(-${active * 100}% + ${dragOffset}px))`,
            transitionDuration: touching ? "0ms" : "500ms",
          }}
        >
          {banners.map((banner, i) => {
            const imgSrc = getImageSrc(banner);
            const href = getHref(banner);
            const slide = (
              <div
                key={banner._id}
                className="relative w-full h-full shrink-0"
                aria-hidden={i !== active}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${i + 1} of ${total}: ${banner.title}`}
              >
                <Image
                  src={imgSrc}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 1400px"
                  priority={i === 0}
                  className="object-cover"
                  draggable={false}
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                {/* Text overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 pointer-events-none">
                  <h2 className="font-display text-white text-lg sm:text-2xl md:text-3xl font-bold tracking-tight drop-shadow-lg">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="text-white/80 text-xs sm:text-sm md:text-base mt-1 max-w-lg drop-shadow">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </div>
            );

            if (href !== "#") {
              return (
                <Link key={banner._id} href={href} className="block w-full h-full shrink-0">
                  {slide}
                </Link>
              );
            }
            return slide;
          })}
        </div>
      </div>

      {/* Animated pill pagination dots */}
      {total > 1 && (
        <div
          className="flex justify-center items-center gap-2 mt-3"
          role="tablist"
          aria-label="Banner navigation"
        >
          {banners.map((banner, i) => (
            <button
              key={banner._id}
              onClick={() => goTo(i)}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to slide ${i + 1}: ${banner.title}`}
              className={`relative h-2 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                i === active
                  ? "w-8 bg-brand-600 dark:bg-brand-400"
                  : "w-2 bg-surface-300 dark:bg-surface-600 hover:bg-surface-400 dark:hover:bg-surface-500"
              }`}
            >
              {i === active && (
                <span className="absolute inset-0 rounded-full bg-brand-400/40 animate-ping" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Slide counter */}
      <div className="absolute top-3 right-3 bg-black/40 text-white text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
        {active + 1}/{total}
      </div>
    </div>
  );
}