import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SupportService } from "@/services/support.service";

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/support");
  if (!hasPermission(session.role, "support.read" as any)) redirect("/");
  const sp = await searchParams;
  const out = await SupportService.adminList(sp.status || undefined, undefined, 1, 30);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Support Tickets ({out.total})</h1>
        <div className="flex gap-2">
          {["", "OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].map((s) => (
            <Link key={s || "all"} href={s ? `/admin/support?status=${s}` : "/admin/support"} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${sp.status === s || (!sp.status && !s) ? "bg-blue-600 text-white" : "bg-white border border-surface-200"}`}>
              {s || "All"}
            </Link>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {(out.items as any[]).map((t) => (
          <Link key={t._id} href={`/admin/support/${t._id}`}>
            <Card className="p-4 hover:shadow-card-hover transition-shadow">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-mono text-xs text-surface-500">{t.ticketNumber} · {t.priority}</p>
                  <p className="font-semibold">{t.subject}</p>
                  <p className="text-xs text-surface-500">{t.user?.name || t.user?.email} · {t.category.replace(/_/g, " ")}</p>
                </div>
                <span className="px-2 py-0.5 bg-surface-100 rounded-full text-xs font-semibold self-start">{t.status.replace(/_/g, " ")}</span>
              </div>
            </Card>
          </Link>
        ))}
        {out.items.length === 0 && <Card className="p-8 text-center text-surface-500 text-sm">No tickets in this state.</Card>}
      </div>
    </div>
  );
}
