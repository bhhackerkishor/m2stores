import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/audit-logs");
  if (!hasPermission(session.role, "audit.read" as any)) redirect("/");
  await connectDB();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const limit = 25;
  const filter: any = {};
  if (sp.action) filter.action = sp.action;
  const total = await AuditLog.countDocuments(filter);
  const items: any[] = await AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).populate("admin", "name email").lean();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
      <p className="text-sm text-surface-500 mb-6">Immutable trail of inventory adjustments, order changes, refunds and admin actions.</p>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b text-left text-xs uppercase text-surface-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-500">No audit entries yet. Adjust inventory or update an order to generate trail.</td></tr>
            ) : items.map((l: any) => (
              <tr key={String(l._id)} className="hover:bg-surface-50">
                <td className="px-4 py-3 text-surface-500 whitespace-nowrap">{formatDate(l.timestamp)}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-3 text-xs">{l.entity}:{String(l.entityId).slice(0, 24)}</td>
                <td className="px-4 py-3 text-xs">{l.admin?.name || l.admin?.email || "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
