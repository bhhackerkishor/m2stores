import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; provider?: string }> }) {
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
  const items: any[] = await Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payments ({total})</h1>
      <form method="get" className="flex gap-2 mb-6 flex-wrap">
        <select name="status" defaultValue={sp.status || ""} className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
          <option value="">All statuses</option>
          {["CREATED","PENDING","PAID","FAILED","CANCELLED","REFUNDED","PARTIALLY_REFUNDED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="provider" defaultValue={sp.provider || ""} className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
          <option value="">All providers</option>
          <option value="PHONEPE">PHONEPE</option>
          <option value="COD">COD</option>
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Filter</button>
      </form>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b text-left text-xs uppercase text-surface-500">
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Provider Txn</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {items.map((p) => (
              <tr key={p.paymentId} className="hover:bg-surface-50">
                <td className="px-4 py-3 font-mono text-xs">{p.paymentId}<p className="text-surface-500">{p.provider}</p></td>
                <td className="px-4 py-3 font-mono text-xs">{p.merchantTransactionId}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatPrice(p.amount)}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-surface-100 rounded-full text-xs font-semibold">{p.status}</span></td>
                <td className="px-4 py-3 text-surface-500">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
