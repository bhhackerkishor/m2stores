"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Tags, Building2, ClipboardList, ShoppingCart,
  Users, CreditCard, Ticket, BadgePercent, Star, Undo2, RefreshCcw, Truck,
  Megaphone, Home, Bell, Headphones, BarChart3, LineChart, Upload, Settings,
  ShieldCheck, FileText, ChevronLeft, ChevronRight, X, Receipt, Scale, MapPin,
} from "lucide-react";

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
}

export function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { section: "Catalog" },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: Tags },
    { href: "/admin/brands", label: "Brands", icon: Building2 },
    { href: "/admin/inventory", label: "Inventory", icon: ClipboardList },
    { section: "Orders" },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { section: "Marketing" },
    { href: "/admin/coupons", label: "Coupons", icon: Ticket },
    { href: "/admin/offers", label: "Offers", icon: BadgePercent },
    { href: "/admin/banners", label: "Banners", icon: Megaphone },
    { href: "/admin/homepage", label: "Homepage", icon: Home },
    { section: "Support" },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/returns", label: "Returns", icon: Undo2 },
    { href: "/admin/refunds", label: "Refunds", icon: RefreshCcw },
    { href: "/admin/shipping", label: "Shipping", icon: Truck },
    { href: "/admin/delivery", label: "Delivery & COD", icon: MapPin },
    { href: "/admin/support", label: "Support", icon: Headphones },
    { section: "Finance" },
    { href: "/admin/finance", label: "Finance", icon: Receipt },
    { href: "/admin/finance/payments", label: "Reconciliation", icon: Scale },
    { section: "System" },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/import-export", label: "Import/Export", icon: Upload },
    { href: "/admin/analytics", label: "Analytics", icon: LineChart },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-overlay-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-surface-900 dark:bg-surface-950 text-white fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-out flex flex-col border-r border-surface-800 ${
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-[72px]" : "lg:w-64"}`}
      >
        {/* Header */}
        <div className="h-14 sm:h-16 flex items-center justify-between px-4 border-b border-surface-800 shrink-0">
          {(!isCollapsed || isMobileOpen) && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-extrabold text-xs">M2</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-brand-400">M2Stores</span>
            </Link>
          )}
          {/* Mobile close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-surface-400 hover:bg-surface-800 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Desktop collapse */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-surface-400 hover:bg-surface-800 hover:text-white transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-none">
          {navItems.map((item, i) => {
            if ("section" in item) {
              if (isCollapsed && !isMobileOpen) return <div key={i} className="h-3" />;
              return (
                <p key={i} className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500 px-3 pt-4 pb-1.5">
                  {item.section}
                </p>
              );
            }
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/admin/analytics" &&
                pathname.startsWith(item.href + "/")) ||
              (item.href === "/admin/analytics" && pathname.startsWith("/admin/analytics/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-surface-400 hover:bg-surface-800 hover:text-white"
                } ${isCollapsed && !isMobileOpen ? "justify-center px-0" : ""}`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
