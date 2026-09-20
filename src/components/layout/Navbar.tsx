"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchAutocomplete } from "@/components/storefront/SearchAutocomplete";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Heart, User, Menu, X, ShoppingCart, Bell, Sun, Moon, Search } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unread, setUnread] = useState(0);
  const { totalItems } = useCart();
  const { items: wished } = useWishlist();
  const { resolved, setTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/notifications?unread=true&limit=50", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setUnread(d.data.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) searchRef.current?.focus();
  }, [mobileSearchOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-white/95 dark:bg-surface-950/95 backdrop-blur-md shadow-sm border-b border-surface-200/50 dark:border-surface-800/50"
            : "bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 no-select">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-sm sm:text-lg tracking-tight">M2</span>
            </div>
            <span className="text-lg sm:text-xl font-extrabold text-surface-900 dark:text-surface-100 hidden sm:block tracking-tight">
              M2Stores
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <SearchAutocomplete />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-surface-600 dark:text-surface-400" />
          </button>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target"
              aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
            >
              {resolved === "dark" ? (
                <Sun className="w-5 h-5 text-surface-400" />
              ) : (
                <Moon className="w-5 h-5 text-surface-500" />
              )}
            </button>

            {/* Account */}
            <Link
              href="/profile"
              aria-label="Account"
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target hidden sm:flex"
            >
              <User className="w-5 h-5 text-surface-600 dark:text-surface-400" />
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label={`Wishlist (${wished.length} items)`}
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target relative"
            >
              <Heart className="w-5 h-5 text-surface-600 dark:text-surface-400" />
              {wished.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-surface-950">
                  {wished.length > 9 ? "9+" : wished.length}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              aria-label={`Notifications (${unread} unread)`}
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target relative hidden sm:flex"
            >
              <Bell className="w-5 h-5 text-surface-600 dark:text-surface-400" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-warning-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-surface-950">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label={`Cart (${totalItems} items)`}
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target relative"
            >
              <ShoppingCart className="w-5 h-5 text-surface-600 dark:text-surface-400" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-surface-950">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 animate-fade-in-down">
            <SearchAutocomplete />
          </div>
        )}

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 animate-fade-in-down">
            <div className="px-4 py-3 space-y-1">
              {[
                { href: "/shop", label: "Shop All" },
                { href: "/orders", label: "My Orders" },
                { href: "/notifications", label: "Notifications" },
                { href: "/support", label: "Help & Support" },
                { href: "/profile/addresses", label: "Addresses" },
                { href: "/profile/security", label: "Security" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
