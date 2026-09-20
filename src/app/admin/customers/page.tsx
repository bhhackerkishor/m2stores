import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/customers");
  if (!hasPermission(session.role, "customers.read" as any)) redirect("/");
  await connectDB();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const limit = 20;
  const filter: any = { role: "CUSTOMER" };
  if (sp.q) filter.$or = [{ name: { $regex: sp.q, $options: "i" } }, { email: { $regex: sp.q, $options: "i" } }, { phone: { $regex: sp.q, $options: "i" } }];
  const total = await User.countDocuments(filter);
  const users: any[] = await User.find(filter).select("name email phone status createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Customers ({total})</h1>
      <form method="get" className="flex gap-2 mb-6">
        <input name="q" defaultValue={sp.q || ""} placeholder="Search name, email, phone…" className="px-3 py-2 rounded-lg border border-surface-200 text-sm w-80" />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Search</button>
      </form>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b text-left text-xs uppercase text-surface-500">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {users.map((u) => (
              <tr key={String(u._id)} className="hover:bg-surface-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${String(u._id)}`} className="font-semibold text-blue-700 hover:underline">{u.name}</Link>
                  <p className="text-xs text-surface-500">{u.email || "—"}</p>
                </td>
                <td className="px-4 py-3">{u.phone}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{u.status}</span></td>
                <td className="px-4 py-3 text-surface-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
