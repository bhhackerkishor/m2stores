import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { redirect, notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

async function getCustomer(id: string) {
  const { connectDB } = await import("@/lib/db");
  const { User } = await import("@/models/User");
  const { Order } = await import("@/models/Order");
  const { Address } = await import("@/models/Address");
  await connectDB();
  const user: any = await User.findById(id).select("-passwordHash -otp -otpExpiresAt").lean();
  if (!user) return null;
  const [orders, addresses, spend] = await Promise.all([
    Order.find({ userId: id }).sort({ createdAt: -1 }).limit(20).lean(),
    Address.find({ userId: id }).lean(),
    Order.aggregate([
      { $match: { userId: (user as any)._id, "paymentInfo.status": "PAID", orderStatus: { $ne: "CANCELLED" } } },
      { $group: { _id: null, total: { $sum: "$pricingSnapshot.grandTotal" }, count: { $sum: 1 } } },
    ]),
  ]);
  return { user, orders, addresses, spend: spend[0] || { total: 0, count: 0 } };
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/customers");
  if (!hasPermission(session.role, "customers.read" as any)) redirect("/");
  const { id } = await params;
  const data = await getCustomer(id);
  if (!data) notFound();

  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-blue-600 hover:underline">← All customers</Link>
      <div className="flex items-center gap-4 mt-3 mb-6">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {(data.user.name || "U").charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{data.user.name}</h1>
          <p className="text-sm text-surface-500">{data.user.email || data.user.phone} · since {formatDate(data.user.createdAt)}</p>
          <p className="text-sm mt-1">Lifetime value: <span className="font-bold">{formatPrice(data.spend.total)}</span> across {data.spend.count} paid orders</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-3">Recent Orders</h3>
          {(data.orders as any[]).length === 0 ? <p className="text-sm text-surface-500">No orders yet.</p> : (
            <ul className="space-y-2 text-sm">
              {(data.orders as any[]).map((o) => (
                <li key={o.orderNumber} className="flex justify-between">
                  <Link href={`/admin/orders/${o.orderNumber}`} className="font-mono text-blue-700 hover:underline">{o.orderNumber}</Link>
                  <span>{o.orderStatus} · {formatPrice(o.pricingSnapshot?.grandTotal || 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Addresses ({(data.addresses as any[]).length})</h3>
          {(data.addresses as any[]).length === 0 ? <p className="text-sm text-surface-500">No saved addresses.</p> : (
            <ul className="space-y-2 text-sm">
              {(data.addresses as any[]).map((a: any) => (
                <li key={String(a._id)}>{a.name} · {a.addressLine1}, {a.city} - {a.pincode} {a.isDefault && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
