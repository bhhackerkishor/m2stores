/**
 * Payment analytics + reconciliation exceptions (read-only).
 */
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Order } from "@/models/Order";
import { Types } from "mongoose";
import { resolveRange, roundMoney, type RangeKey, type ResolvedRange } from "@/lib/analytics/dates";

export interface PaymentException {
  id: string;
  severity: "critical" | "warning";
  type: string;
  title: string;
  description: string;
  orderId: string | null;
  paymentId: string | null;
  href: string;
  timestamp: string;
}

/**
 * Resolve Order.paymentInfo.paymentId → Payment document.
 * Schema: order.paymentInfo.paymentId is Payment._id (ObjectId ref),
 * NOT Payment.paymentId (string business ref like "PAY-...").
 */
function paymentRefIds(raw: unknown): Types.ObjectId[] {
  const out: Types.ObjectId[] = [];
  if (!raw) return out;
  if (raw instanceof Types.ObjectId) return [raw];
  const s = String(raw);
  if (Types.ObjectId.isValid(s)) {
    out.push(new Types.ObjectId(s));
  }
  return out;
}

export interface PaymentAnalyticsOverview {
  range: ResolvedRange;
  byStatus: Array<{ status: string; count: number; amount: number }>;
  byProvider: Array<{ provider: string; count: number; amount: number }>;
  successRate: number | null;
  failureRate: number | null;
  totals: {
    created: number;
    paid: number;
    failed: number;
    pending: number;
    cancelled: number;
    refunded: number;
    partiallyRefunded: number;
    codOrders: number;
    phonepeOrders: number;
  };
  refunds: {
    count: number;
    amount: number;
    pending: number;
  };
  exceptions: PaymentException[];
}

export class PaymentAnalyticsService {
  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<PaymentAnalyticsOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);
    const match = { createdAt: { $gte: r.start, $lte: r.end } };

    const [statusAgg, providerAgg, codOrders, phonepeOrders, exceptions] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: "$provider", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
      Order.countDocuments({ ...match, "paymentInfo.method": "COD" }),
      Order.countDocuments({ ...match, "paymentInfo.method": "PHONEPE" }),
      PaymentAnalyticsService.findExceptions(r),
    ]);

    const byStatus = statusAgg.map((s: any) => ({
      status: s._id || "UNKNOWN",
      count: s.count,
      amount: roundMoney(s.amount || 0),
    }));
    const countOf = (st: string) => byStatus.find((s) => s.status === st)?.count || 0;

    const paid = countOf("PAID");
    const failed = countOf("FAILED");
    const cancelled = countOf("CANCELLED");
    const denom = paid + failed + cancelled;
    const successRate = denom > 0 ? Math.round((paid / denom) * 1000) / 10 : null;
    const failureRate = denom > 0 ? Math.round((failed / denom) * 1000) / 10 : null;

    const refundAgg = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
          updatedAt: { $gte: r.start, $lte: r.end },
        },
      },
      { $group: { _id: null, amount: { $sum: "$refundDetails.amount" }, count: { $sum: 1 } } },
    ]);
    const refundPending = await Payment.countDocuments({
      "refundDetails.status": { $in: ["REFUND_PENDING", "PENDING", "PROCESSING"] },
      "refundDetails.initiatedAt": { $lte: new Date(Date.now() - 48 * 3600_000) },
    });

    return {
      range: r,
      byStatus,
      byProvider: providerAgg.map((p: any) => ({
        provider: p._id || "UNKNOWN",
        count: p.count,
        amount: roundMoney(p.amount || 0),
      })),
      successRate,
      failureRate,
      totals: {
        created: countOf("CREATED"),
        paid,
        failed,
        pending: countOf("PENDING") + countOf("AUTHORIZED"),
        cancelled,
        refunded: countOf("REFUNDED"),
        partiallyRefunded: countOf("PARTIALLY_REFUNDED"),
        codOrders,
        phonepeOrders,
      },
      refunds: {
        count: refundAgg[0]?.count || 0,
        amount: roundMoney(refundAgg[0]?.amount || 0),
        pending: refundPending,
      },
      exceptions,
    };
  }

  static async findExceptions(r: ResolvedRange): Promise<PaymentException[]> {
    const out: PaymentException[] = [];

    const paidOrders = await Order.find({
      "paymentInfo.status": "PAID",
      createdAt: { $gte: r.start, $lte: r.end },
    })
      .select("orderNumber paymentInfo.paymentId paymentInfo.method pricingSnapshot.grandTotal createdAt")
      .limit(200)
      .lean();

    // paymentInfo.paymentId = Payment._id (ObjectId ref), not Payment.paymentId (string)
    const refObjectIds: Types.ObjectId[] = [];
    const refStrings: string[] = [];
    for (const o of paidOrders as any[]) {
      const raw = o.paymentInfo?.paymentId;
      if (!raw) continue;
      refObjectIds.push(...paymentRefIds(raw));
      const s = String(raw);
      if (!Types.ObjectId.isValid(s)) refStrings.push(s);
    }

    const payments =
      refObjectIds.length > 0 || refStrings.length > 0
        ? await Payment.find({
            $or: [
              ...(refObjectIds.length ? [{ _id: { $in: refObjectIds } }] : []),
              ...(refStrings.length ? [{ paymentId: { $in: refStrings } }] : []),
            ],
          })
            .select("_id paymentId orderId amount status refundDetails")
            .lean()
        : [];

    // Index by both _id and string paymentId so either ref shape resolves
    const payById = new Map<string, any>();
    for (const p of payments as any[]) {
      payById.set(String(p._id), p);
      if (p.paymentId) payById.set(String(p.paymentId), p);
    }

    for (const o of paidOrders as any[]) {
      const pid = o.paymentInfo?.paymentId;
      if (!pid) {
        if (o.paymentInfo?.method === "PHONEPE") {
          out.push({
            id: `paid-no-payment-${o._id}`,
            severity: "critical",
            type: "ORDER_PAID_PAYMENT_MISSING",
            title: "Order marked paid but payment missing",
            description: `Order ${o.orderNumber} has paymentInfo.status=PAID but no paymentId.`,
            orderId: String(o._id),
            paymentId: null,
            href: `/admin/orders/${o.orderNumber}`,
            timestamp: o.createdAt?.toISOString?.() || String(o.createdAt),
          });
        }
        continue;
      }

      const pay = payById.get(String(pid));
      if (!pay) {
        out.push({
          id: `orphan-pay-${o._id}`,
          severity: "critical",
          type: "PAYMENT_RECORD_MISSING",
          title: "Payment record not found for paid order",
          description: `Order ${o.orderNumber} references payment ${pid} which does not exist.`,
          orderId: String(o._id),
          paymentId: String(pid),
          href: `/admin/orders/${o.orderNumber}`,
          timestamp: o.createdAt?.toISOString?.() || String(o.createdAt),
        });
      } else if (typeof pay.amount === "number" && typeof o.pricingSnapshot?.grandTotal === "number") {
        if (Math.abs(pay.amount - o.pricingSnapshot.grandTotal) > 1) {
          out.push({
            id: `amount-mismatch-${o._id}`,
            severity: "warning",
            type: "AMOUNT_MISMATCH",
            title: "Payment amount ≠ order total",
            description: `Order ${o.orderNumber}: order ₹${o.pricingSnapshot.grandTotal}, payment ₹${pay.amount}.`,
            orderId: String(o._id),
            paymentId: String(pay.paymentId || pid),
            href: `/admin/orders/${o.orderNumber}`,
            timestamp: o.createdAt?.toISOString?.() || String(o.createdAt),
          });
        }
      }
    }

    // 2. Stuck refunds
    const stuck = await Payment.find({
      "refundDetails.status": { $in: ["REFUND_PENDING", "PENDING", "PROCESSING"] },
      "refundDetails.initiatedAt": { $lte: new Date(Date.now() - 48 * 3600_000) },
    })
      .select("paymentId orderId refundDetails createdAt")
      .limit(20)
      .lean();
    for (const p of stuck as any[]) {
      out.push({
        id: `stuck-refund-${p._id}`,
        severity: "critical",
        type: "REFUND_STUCK",
        title: "Refund pending too long",
        description: `Payment ${p.paymentId} refund has been pending since ${p.refundDetails?.initiatedAt || "unknown"}.`,
        orderId: p.orderId ? String(p.orderId) : null,
        paymentId: String(p.paymentId),
        href: p.orderNumber ? `/admin/orders/${p.orderNumber}` : "/admin/refunds",
        timestamp: p.refundDetails?.initiatedAt?.toISOString?.() || p.createdAt?.toISOString?.(),
      });
    }

    // 3. Payment succeeded but order not PAID (webhook issue)
    const orphanPays = await Payment.find({
      status: "PAID",
      createdAt: { $gte: r.start, $lte: r.end },
    })
      .select("paymentId orderId amount status createdAt")
      .limit(100)
      .lean();
    const orderIds = orphanPays.map((p) => p.orderId).filter(Boolean);
    const orders =
      orderIds.length
        ? await Order.find({ _id: { $in: orderIds } })
            .select("orderNumber paymentInfo.status orderStatus")
            .lean()
        : [];
    const orderByPay = new Map(orders.map((o: any) => [String(o._id), o]));
    for (const p of orphanPays as any[]) {
      const o = orderByPay.get(String(p.orderId));
      if (o && o.paymentInfo?.status !== "PAID" && o.orderStatus !== "CANCELLED") {
        out.push({
          id: `pay-order-desync-${p._id}`,
          severity: "critical",
          type: "PAYMENT_ORDER_DESYNC",
          title: "Payment PAID but order not marked paid",
          description: `Payment ${p.paymentId} is PAID; order ${o.orderNumber} has ${o.paymentInfo?.status}.`,
          orderId: String(p.orderId),
          paymentId: String(p.paymentId),
          href: `/admin/orders/${o.orderNumber}`,
          timestamp: p.createdAt?.toISOString?.(),
        });
      }
    }

    return out.slice(0, 50);
  }
}
