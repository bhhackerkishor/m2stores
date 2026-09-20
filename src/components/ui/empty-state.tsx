import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void; variant?: "primary" | "secondary" };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, action, className, children }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-20 h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-5 text-surface-400 dark:text-surface-500">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">{title}</h3>
      <p className="text-surface-500 dark:text-surface-400 max-w-md mb-6 text-sm leading-relaxed">{description}</p>
      {action && (
        action.onClick ? (
          <button
            onClick={action.onClick}
            className={cn(
              "btn btn-md rounded-xl",
              action.variant === "secondary" ? "btn-secondary" : "btn-primary"
            )}
          >
            {action.label}
          </button>
        ) : (
          <Link
            href={action.href || "/"}
            className={cn(
              "btn btn-md rounded-xl",
              action.variant === "secondary" ? "btn-secondary" : "btn-primary"
            )}
          >
            {action.label}
          </Link>
        )
      )}
      {children}
    </div>
  );
}

export function EmptyCart() {
  return (
    <EmptyState
      icon={<ShoppingBagIcon />}
      title="Your cart is empty"
      description="Looks like you haven't added any items yet. Start browsing to find something you love."
      action={{ label: "Start Shopping", href: "/shop" }}
    />
  );
}

export function EmptyWishlist() {
  return (
    <EmptyState
      icon={<HeartIcon />}
      title="Your wishlist is empty"
      description="Save items you love for later. Tap the heart icon on any product to add it here."
      action={{ label: "Discover Products", href: "/shop" }}
    />
  );
}

export function EmptyOrders() {
  return (
    <EmptyState
      icon={<PackageIcon />}
      title="No orders yet"
      description="When you place an order, it will appear here so you can track its status."
      action={{ label: "Start Shopping", href: "/shop" }}
    />
  );
}

export function EmptySearch({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={<SearchIcon />}
      title={query ? `No results for "${query}"` : "Search for products"}
      description={query ? "Try different keywords, remove filters, or check your spelling." : "Enter a product name, brand, or category to find what you're looking for."}
      action={query ? { label: "Browse All Products", href: "/shop" } : undefined}
    />
  );
}

export function EmptyReviews() {
  return (
    <EmptyState
      icon={<StarIcon />}
      title="No reviews yet"
      description="Be the first to review this product and help other shoppers make a decision."
      className="py-8"
    />
  );
}

export function EmptyAddresses({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<MapPinIcon />}
      title="No saved addresses"
      description="Add a delivery address so you can check out faster next time."
      action={onAction ? { label: "Add Address", onClick: onAction } : { label: "Add Address", href: "/profile/addresses" }}
    />
  );
}

export function EmptyTickets({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<HeadphonesIcon />}
      title="No support tickets"
      description="When you contact support, your tickets will appear here."
      action={onAction ? { label: "Create Ticket", onClick: onAction } : { label: "Contact Support", href: "/support" }}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={<BellIcon />}
      title="No notifications yet"
      description="Order updates, payment confirmations, and support replies will appear here."
    />
  );
}

export function EmptyAdminTable({ entity }: { entity: string }) {
  return (
    <EmptyState
      icon={<TableIcon />}
      title={`No ${entity} found`}
      description={`There are no ${entity} to display right now. Create one or adjust your filters.`}
      className="py-12"
    />
  );
}

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<NotFoundIcon />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={{ label: "Go Home", href: "/" }}
    />
  );
}

export function ForbiddenPage() {
  return (
    <EmptyState
      icon={<LockIcon />}
      title="Access denied"
      description="You don't have permission to view this page. Please contact an administrator if you believe this is an error."
      action={{ label: "Go Home", href: "/" }}
    />
  );
}

export function ServerErrorPage() {
  return (
    <EmptyState
      icon={<ServerErrorIcon />}
      title="Something went wrong"
      description="An unexpected error occurred on our end. Our team has been notified. Please try again in a few moments."
      action={{ label: "Try Again", href: "/", variant: "secondary" }}
    />
  );
}

export function NetworkError() {
  return (
    <EmptyState
      icon={<WifiOffIcon />}
      title="You're offline"
      description="Check your internet connection and try again. Your actions will sync when you're back online."
      action={{ label: "Retry", href: "/", variant: "secondary" }}
    />
  );
}

/* Inline SVG icons for empty states */
function ShoppingBagIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
function HeartIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
}
function PackageIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
}
function SearchIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
function StarIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function MapPinIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function HeadphonesIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>;
}
function BellIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
}
function TableIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>;
}
function NotFoundIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>;
}
function LockIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
function ServerErrorIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function WifiOffIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 12.86a10 10 0 0 1 5.17-2.86"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
}
