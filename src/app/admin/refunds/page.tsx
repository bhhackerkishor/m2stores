import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { ReturnRequest } from "@/models/ReturnRequest";
import { Payment } from "@/models/Payment";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

export default async function AdminRefundsPage() {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/refunds");
  if (!hasPermission(session.role, "payments.read" as any)) redirect("/");
  await connectDB();
  const [returns, payments] = await Promise.all([
    ReturnRequest.find({ "refund.status": { $in: ["PROCESSING", "COMPLETED", "FAILED"] } }).sort({ updatedAt: -1 }).limit(30).lean(),
    Payment.find({ status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] } }).sort({ updatedAt: -1 }).limit(30).lean(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Refunds</h1>
      <p className="text-sm text-surface-500 mb-6">Lifecycle: REQUESTED → APPROVED → PROCESSING → COMPLETED / FAILED — via PaymentProvider.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-3">Return Refunds</h3>
          {(returns as any[]).length === 0 ? <p className="text-sm text-surface-500">No refunds yet.</p> : (
            <ul className="space-y-2 text-sm">
              {(returns as any[]).map((r) => (
                <li key={String(r._id)} className="flex justify-between gap-2">
                  <span className="font-mono">{r.rmaNumber}</span>
                  <span>{r.refund.status} · {formatPrice(r.refund.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Provider Refunds</h3>
          {(payments as any[]).length === 0 ? <p className="text-sm text-surface-500">No provider refunds yet.</p> : (
            <ul className="space-y-2 text-sm">
              {(payments as any[]).map((p) => (
                <li key={p.paymentId} className="flex justify-between gap-2">
                  <span className="font-mono">{p.paymentId}</span>
                  <span>{p.status} · {formatPrice(p.refundDetails?.amount || 0)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-surface-500 mt-3">Trigger refunds from order cancellation or the return detail page.</p>
        </Card>
      </div>
      <p className="text-xs text-surface-400 mt-4">Refunds initiated at {formatDate(new Date())} view. COD refunds settle offline (cash/bank) and are recorded the same way.</p>
    </div>
  );
}
