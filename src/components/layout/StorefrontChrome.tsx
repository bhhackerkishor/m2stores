"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

/**
 * Customer-facing chrome (Navbar / Footer / MobileBottomNav).
 * Rendered from the root layout so it covers every customer page
 * (home, shop, product, cart, checkout, orders, profile, wishlist, etc.)
 * regardless of route grouping. Hidden on admin routes which have
 * their own sidebar + topnav.
 */
export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
