import Link from "next/link";
import Image from "next/image";
import { getSessionFromCookie } from "@/lib/auth-server";
import { OrderService } from "@/services/order.service";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

// Status Badge Styling with Full Dark Mode Support
const STATUS_CONFIG: Record<
  string,
  { label: string; class: string; dotClass: string }
> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    class:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40",
    dotClass: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    class:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40",
    dotClass: "bg-blue-500",
  },
  PROCESSING: {
    label: "Processing",
    class:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40",
    dotClass: "bg-indigo-500",
  },
  PACKED: {
    label: "Packed",
    class:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40",
    dotClass: "bg-purple-500",
  },
  SHIPPED: {
    label: "Shipped",
    class:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/40",
    dotClass: "bg-cyan-500",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    class:
      "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/40",
    dotClass: "bg-teal-500",
  },
  DELIVERED: {
    label: "Delivered",
    class:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40",
    dotClass: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    class:
      "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40",
    dotClass: "bg-rose-500",
  },
};

const FILTER_TABS = [
  { key: "", label: "All Orders" },
  { key: "PENDING_PAYMENT", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
];

interface OrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/orders");

  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));
  const activeStatus = sp.status || "";

  const out = await OrderService.listForCustomer(
    session.userId,
    currentPage,
    10,
    activeStatus || undefined
  );

  const totalPages = Math.ceil((out.total || out.items.length) / 10) || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 transition-colors">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
            My Orders
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Track, manage, and inspect your order history.
          </p>
        </div>

        {/* Quick Summary Pill */}
        {out.items.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-600 dark:text-surface-300">
            <span>Total Orders:</span>
            <span className="font-bold text-surface-900 dark:text-surface-100">
              {out.total ?? out.items.length}
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          const href = tab.key ? `/orders?status=${tab.key}` : "/orders";

          return (
            <Link
              key={tab.key || "all"}
              href={href}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-brand-600 text-white border-brand-600 shadow-sm dark:bg-brand-500 dark:border-brand-500"
                  : "bg-white text-surface-600 border-surface-200 hover:bg-surface-100 dark:bg-surface-800/80 dark:text-surface-300 dark:border-surface-700 dark:hover:bg-surface-700/60"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {out.items.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-3xl">
            📦
          </div>
          <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-1">
            {activeStatus ? "No matching orders found" : "No orders placed yet"}
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto mb-6">
            {activeStatus
              ? `There are no orders with status "${activeStatus.replace(/_/g, " ")}".`
              : "When you place an order, it will show up here with live status and tracking."}
          </p>
          <Link href="/shop" className="btn btn-primary btn-md inline-flex">
            Start Shopping
          </Link>
        </Card>
      ) : (
        /* Order List */
        <div className="space-y-4">
          {(out.items as any[]).map((order) => {
            const statusConfig = STATUS_CONFIG[order.orderStatus] || {
              label: order.orderStatus?.replace(/_/g, " ") || "Unknown",
              class:
                "bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300",
              dotClass: "bg-surface-400",
            };

            const itemsList = order.items || [];
            const itemCount = itemsList.reduce(
              (acc: number, item: any) => acc + (item.quantity || 1),
              0
            );

            return (
              <Link
                key={order.orderNumber}
                href={`/orders/${order.orderNumber}`}
                className="block group"
              >
                <Card className="p-5 sm:p-6 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card transition-all duration-200 group-hover:border-brand-500/50 dark:group-hover:border-brand-500/50 group-hover:shadow-card-hover">
                  {/* Top Bar: Order ID, Date & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-100 dark:border-surface-800">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          Placed on {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.class}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}
                        />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Middle Section: Items Preview */}
                  <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Item Thumbnails / Item List Summary */}
                    <div className="flex items-center gap-3 overflow-hidden">
                      {itemsList.slice(0, 3).map((item: any, idx: number) => (
                        <div
                          key={item.id || idx}
                          className="relative flex-shrink-0 w-12 h-12 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-surface-400"
                        >
                          {item.imageSnapshot || item.image ? (
                            <Image
                              src={item.imageSnapshot || item.image}
                              alt={item.nameSnapshot || "Product image"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span>🛍️</span>
                          )}
                        </div>
                      ))}

                      {itemsList.length > 3 && (
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-600 dark:text-surface-300">
                          +{itemsList.length - 3}
                        </div>
                      )}

                      <div className="ml-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate max-w-xs sm:max-w-md">
                          {itemsList
                            .map((i: any) => i.nameSnapshot || i.name)
                            .filter(Boolean)
                            .join(", ") || "Order Items"}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    {/* Order Total & Arrow Action */}
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-surface-100 dark:border-surface-800">
                      <div className="text-left md:text-right">
                        <span className="text-xs text-surface-500 dark:text-surface-400 block">
                          Total Amount
                        </span>
                        <span className="text-base font-bold text-surface-900 dark:text-surface-50">
                          {formatPrice(order.pricingSnapshot?.grandTotal || 0)}
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 group-hover:bg-brand-600 group-hover:text-white dark:group-hover:bg-brand-500 flex items-center justify-center transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-surface-200 dark:border-surface-800">
          <Link
            href={`/orders?page=${currentPage - 1}${activeStatus ? `&status=${activeStatus}` : ""}`}
            className={`btn btn-secondary btn-sm ${
              currentPage <= 1 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            ← Previous
          </Link>

          <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <Link
            href={`/orders?page=${currentPage + 1}${activeStatus ? `&status=${activeStatus}` : ""}`}
            className={`btn btn-secondary btn-sm ${
              currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}