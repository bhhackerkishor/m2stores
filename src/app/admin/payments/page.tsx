import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";
import Link from "next/link";
import { CreditCard, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; provider?: string }>;
}) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/payments");
  if (!hasPermission(session.role, "payments.read" as any)) redirect("/");

  await connectDB();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const limit = 20;
  const filter: any = {};
  if (sp.status) filter.status = sp.status;
  if (sp.provider) filter.provider = sp.provider;

  const total = await Payment.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;
  const items: any[] = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "PENDING":
      case "CREATED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "FAILED":
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300 border-surface-200 dark:border-surface-700";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Payments
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Overview of all transaction records and gate logs ({total} total)
          </p>
        </div>
      </div>

      {/* Responsive Filters */}
      <Card className="p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
        <form method="get" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              name="status"
              defaultValue={sp.status || ""}
              aria-label="Filter by status"
              className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
                All statuses
              </option>
              {[
                "CREATED",
                "PENDING",
                "PAID",
                "FAILED",
                "CANCELLED",
                "REFUNDED",
                "PARTIALLY_REFUNDED",
              ].map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <select
              name="provider"
              defaultValue={sp.provider || ""}
              aria-label="Filter by provider"
              className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
                All providers
              </option>
              <option value="PHONEPE" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
                PHONEPE
              </option>
              <option value="COD" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
                COD
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            {(sp.status || sp.provider) && (
              <Link
                href="/admin/payments"
                className="px-3 py-2 text-xs font-medium text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 underline"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </Card>

      {/* Main Content Area */}
      <Card className="p-0 overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        {items.length === 0 ? (
          <div className="p-8 text-center text-surface-500 dark:text-surface-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No payment records found matching your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-xs uppercase text-surface-500 dark:text-surface-400 font-semibold">
                    <th className="px-4 py-3.5">Payment ID / Provider</th>
                    <th className="px-4 py-3.5">Provider Txn ID</th>
                    <th className="px-4 py-3.5 text-right">Amount</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {items.map((p) => (
                    <tr
                      key={p.paymentId || p._id}
                      className="hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-surface-900 dark:text-surface-100 block">
                          {p.paymentId}
                        </span>
                        <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
                          {p.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-surface-600 dark:text-surface-300">
                        {p.merchantTransactionId || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-surface-900 dark:text-surface-100">
                        {formatPrice(p.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-surface-500 dark:text-surface-400">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-surface-500 dark:text-surface-400">
                        {p.metadata.orderNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Hidden on desktop) */}
            <div className="block md:hidden divide-y divide-surface-100 dark:divide-surface-800">
              {items.map((p) => (
                <div key={p.paymentId || p._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      
                      <span className="font-mono text-xs font-bold text-surface-900 dark:text-surface-100 block">
                        {p.paymentId}
                      </span>
                       
                      <span className="text-xs text-surface-500 dark:text-surface-400">
                        {p.provider}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                        p.status
                      )}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-surface-100/60 dark:border-surface-800/60 text-xs">
                    <span className="text-surface-500 dark:text-surface-400">Provider Txn:</span>
                    <span className="font-mono text-surface-700 dark:text-surface-300">
                      {p.merchantTransactionId || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-surface-500 dark:text-surface-400">Order Number:</span>
                    <span className="font-mono text-surface-700 dark:text-surface-300 underline">
                      <Link  key={p.metadata.orderNumber}
                             href={`/admin/orders/${p.metadata.orderNumber}`}>
                  {p.metadata.orderNumber || "—"}</Link>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-surface-500 dark:text-surface-400">Date:</span>
                    <span className="text-surface-600 dark:text-surface-300">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                      Total Amount
                    </span>
                    <span className="text-base font-bold text-surface-900 dark:text-surface-100">
                      {formatPrice(p.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
            <span className="text-xs text-surface-500 dark:text-surface-400">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/payments?page=${page - 1}${sp.status ? `&status=${sp.status}` : ""}${
                  sp.provider ? `&provider=${sp.provider}` : ""
                }`}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                  page <= 1
                    ? "pointer-events-none opacity-40 border-surface-200 dark:border-surface-800 text-surface-400"
                    : "border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Link>
              <Link
                href={`/admin/payments?page=${page + 1}${sp.status ? `&status=${sp.status}` : ""}${
                  sp.provider ? `&provider=${sp.provider}` : ""
                }`}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                  page >= totalPages
                    ? "pointer-events-none opacity-40 border-surface-200 dark:border-surface-800 text-surface-400"
                    : "border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200"
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}