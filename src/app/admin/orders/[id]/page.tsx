import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { OrderService } from "@/services/order.service";
import { redirect, notFound } from "next/navigation";
import { AdminOrderDetailClient } from "@/components/admin/AdminOrderDetailClient";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/orders");
  if (!hasPermission(session.role, "orders.read" as any)) redirect("/");
  const { id } = await params;
  let data: any = null;
  try {
    data = await OrderService.adminGet(id);
  } catch {
    notFound();
  }
  return <AdminOrderDetailClient order={JSON.parse(JSON.stringify(data.order))} payment={data.payment ? JSON.parse(JSON.stringify(data.payment)) : null} />;
}
