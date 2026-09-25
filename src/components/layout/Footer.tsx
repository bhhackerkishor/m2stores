"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  ArrowUp,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-brand-900 dark:bg-surface-950 text-white border-t border-surface-800 dark:border-surface-900 transition-colors duration-200 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* 1. Brand Column */}
          <div className="lg:col-span-3 flex flex-col justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center shadow-lg border border-white/10">
                  <span className="text-white font-black text-base">M2</span>
                </div>
                <span className="text-2xl font-bold tracking-tight text-white font-display">
                  M2Stores
                </span>
              </Link>
              
              <p className="text-surface-400 text-sm leading-relaxed max-w-sm mb-8 font-light">
                India&apos;s premium online marketplace for electronics, fashion, home &amp; more. Multilingual team. Guaranteed authenticity.
              </p>
            </div>

            {/* Circular Social Buttons */}
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-surface-700/80 flex items-center justify-center text-surface-400 hover:text-white hover:border-brand-400 transition-all duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4 stroke-[1.5]" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-surface-700/80 flex items-center justify-center text-surface-400 hover:text-white hover:border-brand-400 transition-all duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 stroke-[1.5]" />
              </a>
              <a
                href="https://line.me"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-surface-700/80 flex items-center justify-center text-surface-400 hover:text-white hover:border-brand-400 transition-all duration-200 font-bold text-xs"
                aria-label="Line"
              >
                LINE
              </a>
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-surface-700/80 flex items-center justify-center text-surface-400 hover:text-white hover:border-brand-400 transition-all duration-200"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4 stroke-[1.5]" />
              </a>
            </div>
          </div>

          {/* 2. Shop & Account Columns */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Shop Column */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.2em] text-warning-400 dark:text-warning-300 mb-6">
                SHOP
              </h4>
              <ul className="space-y-3.5 text-sm text-surface-300">
                {[
                  { href: "/shop", label: "All Products" },
                  { href: "/shop?sort=newest", label: "New Arrivals" },
                  { href: "/shop?sort=popularity", label: "Bestsellers" },
                  { href: "/coupons", label: "Deals & Offers" },
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 hover:text-white transition-colors duration-200 group"
                    >
                      <span className="text-surface-500 group-hover:text-brand-400 transition-colors">
                        &mdash;
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* My Account Column */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.2em] text-warning-400 dark:text-warning-300 mb-6">
                ACCOUNT
              </h4>
              <ul className="space-y-3.5 text-sm text-surface-300">
                {[
                  { href: "/profile", label: "My Profile" },
                  { href: "/orders", label: "Orders" },
                  { href: "/wishlist", label: "Wishlist" },
                  { href: "/profile/addresses", label: "Addresses" },
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 hover:text-white transition-colors duration-200 group"
                    >
                      <span className="text-surface-500 group-hover:text-brand-400 transition-colors">
                        &mdash;
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3. Customer Care & Policies Columns */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Customer Care Column */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.2em] text-warning-400 dark:text-warning-300 mb-6">
                HELP
              </h4>
              <ul className="space-y-3.5 text-sm text-surface-300">
                {[
                  { href: "/support", label: "Help Center" },
                  { href: "/contact", label: "Contact Us" },
                  { href: "/privacy-policy", label: "Privacy Policy" },
                  { href: "/terms-and-conditions", label: "Terms & Conditions" },
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 hover:text-white transition-colors duration-200 group"
                    >
                      <span className="text-surface-500 group-hover:text-brand-400 transition-colors">
                        &mdash;
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies Column */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.2em] text-warning-400 dark:text-warning-300 mb-6">
                POLICIES
              </h4>
              <ul className="space-y-3.5 text-sm text-surface-300">
                {[
                  { href: "/shipping-policy", label: "Shipping Policy" },
                  { href: "/cancellation-policy", label: "Cancellation Policy" },
                  { href: "/refund-policy", label: "Refund Policy" },
                  { href: "/orders", label: "Track Orders" },
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 hover:text-white transition-colors duration-200 group"
                    >
                      <span className="text-surface-500 group-hover:text-brand-400 transition-colors">
                        &mdash;
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Get In Touch Info Grid */}
          <div className="lg:col-span-3 space-y-6">
            <h4 className="font-semibold text-xs uppercase tracking-[0.2em] text-warning-400 dark:text-warning-300 mb-6">
              GET IN TOUCH
            </h4>

            {/* Call */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-900/30 border border-surface-700/60 flex items-center justify-center shrink-0 text-brand-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-0.5">
                  CALL
                </p>
                <a
                  href="tel:+9118001234567"
                  className="text-sm font-semibold text-surface-100 hover:text-white transition-colors"
                >
                  +91 (0) 1800 123 4567
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-900/30 border border-surface-700/60 flex items-center justify-center shrink-0 text-brand-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-0.5">
                  EMAIL
                </p>
                <a
                  href="mailto:support@m2stores.com"
                  className="text-sm font-semibold text-surface-100 hover:text-white transition-colors"
                >
                  support@m2stores.com
                </a>
              </div>
            </div>

            {/* Visit */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-900/30 border border-surface-700/60 flex items-center justify-center shrink-0 text-brand-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-0.5">
                  VISIT
                </p>
                <p className="text-xs text-surface-300 leading-relaxed max-w-xs">
                  M2Stores Tech Park, Unit # 306, 3rd Floor, Outer Ring Road, Bengaluru, 560103, India.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar Segment */}
        <div className="mt-16 pt-8 border-t border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} M2Stores Co., Ltd. All rights reserved.
          </p>

          {/* Back to top CTA */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-surface-300 hover:text-white border border-surface-700/80 rounded-full px-5 py-2.5 transition-all duration-300 hover:border-brand-400 bg-surface-900/80 backdrop-blur-sm"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5 text-brand-400" />
          </button>
        </div>
      </div>

      {/* Background Large Text Watermark */}
      <div 
        aria-hidden="true" 
        className="absolute bottom-0 left-0 right-0 pointer-events-none select-none overflow-hidden flex justify-center z-0 opacity-[0.03]"
      >
        <span className="text-[18vw] font-black tracking-tighter text-white whitespace-nowrap leading-none transform translate-y-[20%]">
          M2Stores
        </span>
      </div>
    </footer>
  );
}