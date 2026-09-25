/**
 * Shared Mongo match builders so every service uses identical revenue semantics.
 *
 * Canonical definitions:
 * - paidMatch: payment PAID + not CANCELLED + date range on order.createdAt
 * - Revenue (KPI): sum pricingSnapshot.grandTotal
 * - Line gross: sum items.finalLineTotal
 */
import type { ResolvedRange } from "./dates";

export function createdAtRange(r: Pick<ResolvedRange, "start" | "end">) {
  return { createdAt: { $gte: r.start, $lte: r.end } };
}

export function createdAtPrev(r: Pick<ResolvedRange, "prevStart" | "prevEnd">) {
  return { createdAt: { $gte: r.prevStart, $lte: r.prevEnd } };
}

/** Paid non-cancelled orders in range — THE definition of a “countable” sale. */
export function paidMatch(r: Pick<ResolvedRange, "start" | "end">) {
  return {
    "paymentInfo.status": "PAID",
    orderStatus: { $ne: "CANCELLED" },
    ...createdAtRange(r),
  };
}

export function paidMatchPrev(r: Pick<ResolvedRange, "prevStart" | "prevEnd">) {
  return {
    "paymentInfo.status": "PAID",
    orderStatus: { $ne: "CANCELLED" },
    ...createdAtPrev(r),
  };
}

/** Revenue group stage (order-level grand total). */
export const revenueGroupStage = {
  $group: {
    _id: null,
    revenue: { $sum: "$pricingSnapshot.grandTotal" },
    orders: { $sum: 1 },
    discounts: {
      $sum: { $add: ["$pricingSnapshot.couponDiscount", "$pricingSnapshot.offerDiscount"] },
    },
    tax: { $sum: "$pricingSnapshot.taxTotal" },
    shipping: { $sum: "$pricingSnapshot.shippingFee" },
    codFees: { $sum: "$pricingSnapshot.codFee" },
    units: { $sum: { $sum: "$items.quantity" } },
  },
} as const;

/** Unwind + line gross (pre order-level discounts). */
export const lineGrossStages = [
  { $unwind: "$items" },
  {
    $group: {
      _id: null,
      gross: { $sum: "$items.finalLineTotal" },
      units: { $sum: "$items.quantity" },
      lineDiscounts: { $sum: "$items.discountAmount" },
    },
  },
] as const;
