import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from "@/models/SupportTicket";
import { NotificationService } from "./notification/notification.service";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

function ticketNumber(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SUP-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const CUSTOMER_CLOSEABLE: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED"];

export class SupportService {
  static async createTicket(userId: string, input: { subject: string; category: TicketCategory; priority?: TicketPriority; message: string; orderId?: string }) {
    await connectDB();
    if (!input.subject.trim() || !input.message.trim()) throw new AppError("Subject and message are required", 400, "VALIDATION_ERROR");
    const ticket: any = await SupportTicket.create({
      ticketNumber: ticketNumber(),
      user: userId,
      subject: input.subject.trim().slice(0, 200),
      category: input.category,
      priority: input.priority || "MEDIUM",
      status: "OPEN",
      messages: [{ sender: "CUSTOMER", senderId: userId as any, content: input.message.trim().slice(0, 10000), timestamp: new Date() }],
      orderId: input.orderId || undefined,
    });
    logger.info("Support ticket created", "support", { ticketNumber: ticket.ticketNumber });
    return ticket.toObject();
  }

  static async listForUser(userId: string, status?: string) {
    await connectDB();
    const filter: any = { user: userId };
    if (status) filter.status = status;
    return SupportTicket.find(filter).sort({ updatedAt: -1 }).lean();
  }

  static async getForUser(ticketId: string, userId: string) {
    await connectDB();
    const t: any = await SupportTicket.findOne({ _id: ticketId, user: userId }).lean();
    if (!t) throw new AppError("Ticket not found", 404, "NOT_FOUND");
    return t;
  }

  static async customerReply(ticketId: string, userId: string, content: string) {
    await connectDB();
    if (!content.trim()) throw new AppError("Message is required", 400, "VALIDATION_ERROR");
    const t: any = await SupportTicket.findOne({ _id: ticketId, user: userId });
    if (!t) throw new AppError("Ticket not found", 404, "NOT_FOUND");
    if (t.status === "CLOSED") throw new AppError("Ticket is closed", 400, "TICKET_CLOSED");
    t.messages.push({ sender: "CUSTOMER", senderId: userId as any, content: content.trim().slice(0, 10000), timestamp: new Date() });
    // Customer activity reopens resolved threads back to the queue
    if (t.status === "RESOLVED" || t.status === "WAITING_FOR_CUSTOMER") t.status = "IN_PROGRESS";
    else if (t.status === "OPEN") t.status = "IN_PROGRESS";
    await t.save();
    return t.toObject();
  }

  static async adminList(status?: string, priority?: string, page = 1, limit = 20) {
    await connectDB();
    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const total = await SupportTicket.countDocuments(filter);
    const items = await SupportTicket.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email phone").lean();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async adminReply(ticketId: string, adminId: string, content: string, nextStatus?: TicketStatus) {
    await connectDB();
    if (!content.trim()) throw new AppError("Message is required", 400, "VALIDATION_ERROR");
    const t: any = await SupportTicket.findById(ticketId);
    if (!t) throw new AppError("Ticket not found", 404, "NOT_FOUND");
    if (t.status === "CLOSED" && nextStatus !== "CLOSED") {
      throw new AppError("Ticket is closed — reopen is not allowed from this action", 400, "TICKET_CLOSED");
    }
    t.messages.push({ sender: "ADMIN", senderId: adminId as any, content: content.trim().slice(0, 10000), timestamp: new Date() });
    const target = nextStatus || "WAITING_FOR_CUSTOMER";
    const allowed: Record<TicketStatus, TicketStatus[]> = {
      OPEN: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"],
      IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"],
      WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
      RESOLVED: ["CLOSED", "IN_PROGRESS"],
      CLOSED: ["CLOSED"],
    };
    if (!allowed[t.status as TicketStatus].includes(target)) {
      throw new AppError(`Cannot move ticket from ${t.status} to ${target}`, 400, "INVALID_STATUS");
    }
    t.status = target;
    if (target === "RESOLVED" || target === "CLOSED") {
      t.resolvedBy = adminId as any;
      t.resolvedAt = new Date();
    }
    await t.save();
    await NotificationService.notify("SUPPORT_REPLY", {
      userId: String(t.user),
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      link: `/support/${String(t._id)}`,
    });
    return t.toObject();
  }

  static async customerClose(ticketId: string, userId: string) {
    await connectDB();
    // Ownership must be part of the filter — never fetched first (BOLA guard)
    const t: any = await SupportTicket.findOne({ _id: ticketId, user: userId });
    if (!t) throw new AppError("Ticket not found", 404, "NOT_FOUND");
    if (!CUSTOMER_CLOSEABLE.includes(t.status)) throw new AppError(`Cannot close from ${t.status}`, 400, "INVALID_STATUS");
    t.status = "CLOSED";
    t.resolvedAt = new Date();
    await t.save();
    return t.toObject();
  }
}
