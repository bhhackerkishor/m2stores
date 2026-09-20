import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminNotificationsPage() {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/admin/notifications");
  if (!hasPermission(session.role, "notifications.read" as any)) redirect("/");
  await connectDB();
  const items: any[] = await Notification.find().sort({ createdAt: -1 }).limit(50).populate("userId", "name email").lean();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Notifications</h1>
      <p className="text-sm text-surface-500 mb-6">Latest in-app events across customers. Email/SMS fan out per store settings.</p>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b text-left text-xs uppercase text-surface-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-500">No notifications yet. Place an order or reply to a ticket to generate events.</td></tr>
            ) : items.map((n: any) => (
              <tr key={String(n._id)}>
                <td className="px-4 py-3 text-surface-500 whitespace-nowrap">{formatDate(n.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-xs">{n.event}</td>
                <td className="px-4 py-3">{n.title}</td>
                <td className="px-4 py-3 text-xs">{n.userId?.name || n.userId?.email || String(n.userId).slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
