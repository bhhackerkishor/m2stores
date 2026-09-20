import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { OrderService } from "@/services/order.service";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; q?: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/orders");
  if (!hasPermission(session.role, "orders.read" as any)) redirect("/");
  const sp = await searchParams;
  const out = await OrderService.adminList({ page: parseInt(sp.page || "1"), limit: 20, status: sp.status, q: sp.q });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Orders ({out.total})</h1>
      <form method="get" className="flex gap-2 mb-6 flex-wrap">
        <input name="q" defaultValue={sp.q || ""} placeholder="Search order number…" className="px-3 py-2 rounded-lg border border-surface-200 text-sm" />
        <select name="status" defaultValue={sp.status || ""} className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
          <option value="">All statuses</option>
          {["PENDING_PAYMENT","CONFIRMED","PROCESSING","PACKED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Filter</button>
      </form>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b text-left text-xs uppercase text-surface-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {(out.items as any[]).map((o) => (
              <tr key={o.orderNumber} className="hover:bg-surface-50">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.orderNumber}`} className="font-mono font-bold text-blue-700 hover:underline">{o.orderNumber}</Link></td>
                <td className="px-4 py-3 text-surface-500">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3">{(o.items || []).length}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatPrice(o.pricingSnapshot?.grandTotal || 0)}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-surface-100 rounded-full text-xs font-semibold">{o.orderStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
