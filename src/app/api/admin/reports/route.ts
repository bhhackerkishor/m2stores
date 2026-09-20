import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { InventoryState } from "@/models/Inventory";
import { User } from "@/models/User";
import { Coupon } from "@/models/Coupon";
import { toCsv } from "@/lib/csv";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const schema = z.object({
  type: z.enum(["sales", "orders", "refunds", "inventory", "customers", "coupons", "payments"]),
  format: z.enum(["csv", "json"]).default("csv"),
  from: z.string().optional(),
  to: z.string().optional(),
});

function range(from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = from ? new Date(from) : new Date(0);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "reports.export" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Reports permission required"), { status: 403 });
    }
    const sp = new URL(request.url).searchParams;
    const parsed = schema.safeParse({ type: sp.get("type"), format: sp.get("format") || "csv", from: sp.get("from") || undefined, to: sp.get("to") || undefined });
    if (!parsed.success) return NextResponse.json(errorResponse("VALIDATION_ERROR", "Invalid report type"), { status: 400 });
    await connectDB();
    const { type, format, from, to } = parsed.data;
    const { start, end } = range(from, to);

    let headers: string[] = [];
    let rows: Array<Array<string | number>> = [];

    if (type === "sales" || type === "orders") {
      const orders: any[] = await Order.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(5000).lean();
      headers = ["orderNumber", "date", "status", "paymentMethod", "paymentStatus", "items", "grandTotal"];
      rows = orders.map((o) => [
        o.orderNumber, new Date(o.createdAt).toISOString(), o.orderStatus, o.paymentInfo?.method, o.paymentInfo?.status,
        (o.items || []).reduce((s: number, i: any) => s + i.quantity, 0), o.pricingSnapshot?.grandTotal ?? 0,
      ]);
    } else if (type === "refunds") {
      const pays: any[] = await Payment.find({ status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] }, updatedAt: { $gte: start, $lte: end } }).limit(5000).lean();
      headers = ["paymentId", "merchantTransactionId", "provider", "amount", "refunded", "status"];
      rows = pays.map((p) => [p.paymentId, p.merchantTransactionId, p.provider, p.amount, p.refundDetails?.amount || 0, p.status]);
    } else if (type === "inventory") {
      const states: any[] = await InventoryState.find().populate("productId", "name").limit(5000).lean();
      headers = ["sku", "product", "stock", "reserved", "available", "lowThreshold"];
      rows = states.map((s) => [s.sku, (s.productId as any)?.name || String(s.productId), s.stock, s.reservedStock, s.stock - s.reservedStock, s.lowStockThreshold ?? 5]);
    } else if (type === "customers") {
      const users: any[] = await User.find({ role: "CUSTOMER", createdAt: { $gte: start, $lte: end } }).select("name email phone createdAt").limit(5000).lean();
      headers = ["name", "email", "phone", "joined"];
      rows = users.map((u) => [u.name, u.email || "", u.phone, new Date(u.createdAt).toISOString()]);
    } else if (type === "coupons") {
      const coupons: any[] = await Coupon.find().lean();
      headers = ["code", "type", "value", "minOrder", "used", "limit", "active"];
      rows = coupons.map((c) => [c.code, c.discountType, c.discountValue, c.minOrderValue, c.usageCount, c.usageLimitTotal, c.isActive ? "yes" : "no"]);
    } else {
      const pays: any[] = await Payment.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(5000).lean();
      headers = ["paymentId", "provider", "amount", "status", "date"];
      rows = pays.map((p) => [p.paymentId, p.provider, p.amount, p.status, new Date(p.createdAt).toISOString()]);
    }

    if (format === "json") {
      return NextResponse.json({ success: true, data: { headers, rows, count: rows.length } });
    }
    const csv = toCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="m2stores-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Reports error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Report failed"), { status: 500 });
  }
}
