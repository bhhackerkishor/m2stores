"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { items: wished } = useWishlist();

  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/shop", label: "Shop", icon: LayoutGrid },
    { href: "/wishlist", label: "Wishlist", icon: Heart, badge: wished.length },
    { href: "/cart", label: "Cart", icon: ShoppingCart, badge: totalItems },
    { href: "/profile", label: "Account", icon: User },
  ];

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/verify-otp") ||
    pathname.startsWith("/forgot-password")
  ) {
    return null;
  }

  return (
    <>
      <div className="h-[60px] md:hidden" aria-hidden="true" />
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-[60px]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150 no-select ${
                  active
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-surface-500 dark:text-surface-400 active:text-surface-700 dark:active:text-surface-300"
                }`}
              >
                {/* Active indicator pill */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-brand-600 dark:bg-brand-400 rounded-b-full" />
                )}
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  {(t.badge || 0) > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-surface-950 ${
                        active ? "bg-brand-600 text-white" : "bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900"
                      }`}
                    >
                      {(t.badge || 0) > 99 ? "99+" : t.badge}
                    </span>
                  )}
                </span>
                <span className="leading-none">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
