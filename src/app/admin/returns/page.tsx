import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ReturnService } from "@/services/return.service";
import { formatPrice, formatDate } from "@/lib/utils";

export default async function AdminReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/returns");
  if (!hasPermission(session.role, "returns.read" as any)) redirect("/");
  const sp = await searchParams;
  const out = await ReturnService.adminList(sp.status || undefined, 1, 30);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Returns ({out.total})</h1>
        <div className="flex gap-2 flex-wrap">
          {["", "REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"].map((s) => (
            <Link key={s || "all"} href={s ? `/admin/returns?status=${s}` : "/admin/returns"} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${sp.status === s || (!sp.status && !s) ? "bg-blue-600 text-white" : "bg-white border border-surface-200"}`}>
              {s || "All"}
            </Link>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {(out.items as any[]).map((r) => (
          <Link key={r._id} href={`/admin/returns/${r._id}`}>
            <Card className="p-4 hover:shadow-card-hover transition-shadow">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-mono text-xs text-surface-500">{r.rmaNumber} · {r.orderNumber}</p>
                  <p className="font-semibold text-sm mt-0.5">{(r.items || []).map((i: any) => `${i.sku} × ${i.quantity}`).join(", ")}</p>
                  <p className="text-xs text-surface-500 mt-1">{r.reason} · {formatDate(r.requestedAt)} · refund {formatPrice(r.refund?.amount || 0)}</p>
                </div>
                <span className="px-2 py-0.5 bg-surface-100 rounded-full text-xs font-semibold self-start">{r.status}</span>
              </div>
            </Card>
          </Link>
        ))}
        {out.items.length === 0 && <Card className="p-8 text-center text-surface-500 text-sm">No returns in this state.</Card>}
      </div>
    </div>
  );
}
