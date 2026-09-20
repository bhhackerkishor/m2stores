import { connectDB } from "@/lib/db";
import { Notification, NotificationEvent } from "@/models/Notification";
import { User } from "@/models/User";
import { Setting } from "@/models/Setting";
import { getEmailProvider, getSmsProvider, NOTIFICATION_TEMPLATES } from "./notification.interface";
import { logger } from "@/lib/logger";

export class NotificationService {
  static async notify(event: NotificationEvent, ctx: { userId: string; orderNumber?: string; link?: string; [k: string]: any }) {
    try {
      await connectDB();
      const t = NOTIFICATION_TEMPLATES[event](ctx);
      const channels: Array<"IN_APP" | "EMAIL" | "SMS"> = ["IN_APP"];
      const settings: any = await Setting.findOne().lean().catch(() => null);
      const user: any = await User.findById(ctx.userId).lean().catch(() => null);

      if (settings?.notificationEmailEnabled && user?.email) channels.push("EMAIL");
      if (settings?.notificationSMSEnabled && user?.phone) channels.push("SMS");

      await Notification.create({
        userId: ctx.userId as any,
        event,
        title: t.title,
        body: t.body,
        link: ctx.link || (ctx.orderNumber ? `/orders/${ctx.orderNumber}` : undefined),
        orderNumber: ctx.orderNumber,
        channels,
        read: false,
      });

      if (channels.includes("EMAIL") && user?.email) {
        await getEmailProvider().send({ to: user.email, subject: t.title, text: t.body }).catch(() => {});
      }
      if (channels.includes("SMS") && user?.phone) {
        await getSmsProvider().send({ to: user.phone, text: `${t.title} — ${t.body}` }).catch(() => {});
      }
    } catch (e) {
      // Notifications never break the triggering flow
      logger.warn("Notification failed (non-blocking)", "notification", { event, error: String(e) });
    }
  }

  static async listForUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
    await connectDB();
    const filter: any = { userId };
    if (unreadOnly) filter.read = false;
    const total = await Notification.countDocuments(filter);
    const items = await Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const unread = await Notification.countDocuments({ userId, read: false });
    return { items, total, unread, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async markRead(userId: string, id: string) {
    await connectDB();
    await Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
    return { ok: true };
  }

  static async markAllRead(userId: string) {
    await connectDB();
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return { ok: true };
  }
}
