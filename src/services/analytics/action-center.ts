/**
 * Action Center — high-priority operational alerts from real data.
 */
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { InventoryState } from "@/models/Inventory";
import { Product } from "@/models/Product";
import { ReturnRequest } from "@/models/ReturnRequest";
import { resolveRange, type RangeKey } from "@/lib/analytics/dates";
import { PaymentAnalyticsService } from "./payment.analytics";
import { InventoryAnalyticsService } from "./inventory.analytics";

export interface ActionItem {
  id: string;
  category: "orders" | "inventory" | "payments" | "returns" | "customers";
  priority: "critical" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  href: string;
  actionLabel: string;
}

export class ActionCenterService {
  static async list(range: RangeKey = "30d"): Promise<ActionItem[]> {
    await connectDB();
    const r = resolveRange(range);
    const now = Date.now();
    const items: ActionItem[] = [];

    const [
      pendingPayOld,
      processingOld,
      shipReady,
      lowInv,
      outInv,
      stuckRefunds,
      payExceptions,
      openReturns,
      slowReturns,
      failedPayments24h,
      pendingCodConfirm,
    ] = await Promise.all([
      Order.countDocuments({
        orderStatus: "PENDING_PAYMENT",
        createdAt: { $lt: new Date(now - 2 * 3600_000) },
      }),
      Order.countDocuments({
        orderStatus: { $in: ["CONFIRMED", "PROCESSING"] },
        createdAt: { $lt: new Date(now - 24 * 3600_000) },
      }),
      Order.countDocuments({
        orderStatus: "PACKED",
        updatedAt: { $lt: new Date(now - 24 * 3600_000) },
      }),
      (async () => {
        const inv = await InventoryAnalyticsService.overview(range);
        return {
          low: inv.totals.lowStockSkus,
          out: inv.totals.outOfStockSkus,
        };
      })(),
      0,
      Payment.countDocuments({
        "refundDetails.status": { $in: ["REFUND_PENDING", "PENDING", "PROCESSING"] },
        "refundDetails.initiatedAt": { $lte: new Date(now - 48 * 3600_000) },
      }),
      PaymentAnalyticsService.findExceptions(r),
      ReturnRequest.countDocuments({ status: "REQUESTED" }),
      ReturnRequest.countDocuments({
        status: "APPROVED",
        updatedAt: { $lt: new Date(now - 48 * 3600_000) },
      }),
      Payment.countDocuments({
        status: "FAILED",
        createdAt: { $gte: new Date(now - 24 * 3600_000) },
      }),
      Order.countDocuments({
        "paymentInfo.method": "COD",
        orderStatus: "PENDING_PAYMENT",
        createdAt: { $lt: new Date(now - 6 * 3600_000) },
      }),
    ]);
    void outInv;
    void lowInv;

    if (slowReturns > 0) {
      items.push({
        id: "slow-returns",
        category: "returns",
        priority: "info",
        title: "Approved returns slow",
        description: `${slowReturns} approved return(s) not updated for 48+ hours.`,
        count: slowReturns,
        href: "/admin/returns",
        actionLabel: "Follow up",
      });
    }

    if (pendingPayOld > 0) {
      items.push({
        id: "stale-pending-payment",
        category: "orders",
        priority: "critical",
        title: "Stale pending payments",
        description: `${pendingPayOld} order(s) stuck in PENDING_PAYMENT for over 2 hours.`,
        count: pendingPayOld,
        href: "/admin/orders?status=PENDING_PAYMENT",
        actionLabel: "Review",
      });
    }
    if (pendingCodConfirm > 0) {
      items.push({
        id: "cod-awaiting",
        category: "orders",
        priority: "warning",
        title: "COD orders awaiting confirmation",
        description: `${pendingCodConfirm} COD order(s) unconfirmed for 6+ hours.`,
        count: pendingCodConfirm,
        href: "/admin/orders?status=PENDING_PAYMENT",
        actionLabel: "Confirm",
      });
    }
    if (processingOld > 0) {
      items.push({
        id: "slow-processing",
        category: "orders",
        priority: "warning",
        title: "Orders processing >24h",
        description: `${processingOld} confirmed/processing order(s) older than 24 hours.`,
        count: processingOld,
        href: "/admin/orders?status=PROCESSING",
        actionLabel: "Open queue",
      });
    }
    if (shipReady > 0) {
      items.push({
        id: "packed-not-shipped",
        category: "orders",
        priority: "info",
        title: "Packed, awaiting shipment",
        description: `${shipReady} packed order(s) not shipped within 24 hours.`,
        count: shipReady,
        href: "/admin/orders?status=PACKED",
        actionLabel: "Ship",
      });
    }
    if (lowInv.low > 0) {
      items.push({
        id: "low-stock",
        category: "inventory",
        priority: "warning",
        title: "Low stock SKUs",
        description: `${lowInv.low} SKU(s) at or below reorder threshold.`,
        count: lowInv.low,
        href: "/admin/inventory?health=low",
        actionLabel: "Restock",
      });
    }
    if (lowInv.out > 0) {
      items.push({
        id: "out-of-stock",
        category: "inventory",
        priority: "critical",
        title: "Out of stock",
        description: `${lowInv.out} SKU(s) with zero available units.`,
        count: lowInv.out,
        href: "/admin/inventory?health=out",
        actionLabel: "Fix",
      });
    }
    if (stuckRefunds > 0) {
      items.push({
        id: "stuck-refunds",
        category: "payments",
        priority: "critical",
        title: "Stuck refunds",
        description: `${stuckRefunds} refund(s) pending longer than 48 hours.`,
        count: stuckRefunds,
        href: "/admin/refunds",
        actionLabel: "Chase",
      });
    }
    if (payExceptions.length > 0) {
      items.push({
        id: "payment-exceptions",
        category: "payments",
        priority: "critical",
        title: "Payment reconciliation exceptions",
        description: `${payExceptions.length} mismatch/missing payment issue(s) detected.`,
        count: payExceptions.length,
        href: "/admin/finance/payments",
        actionLabel: "Reconcile",
      });
    }
    if (failedPayments24h > 0) {
      items.push({
        id: "failed-payments",
        category: "payments",
        priority: "warning",
        title: "Failed payments (24h)",
        description: `${failedPayments24h} payment attempt(s) failed in the last 24 hours.`,
        count: failedPayments24h,
        href: "/admin/finance/payments",
        actionLabel: "Inspect",
      });
    }
    if (openReturns > 0) {
      items.push({
        id: "open-returns",
        category: "returns",
        priority: "warning",
        title: "Open return requests",
        description: `${openReturns} return request(s) awaiting review.`,
        count: openReturns,
        href: "/admin/returns",
        actionLabel: "Process",
      });
    }

    const order = { critical: 0, warning: 1, info: 2 } as const;
    items.sort((a, b) => order[a.priority] - order[b.priority] || b.count - a.count);

    // sanity touch models
    void Product;
    void InventoryState;
    return items;
  }
}
