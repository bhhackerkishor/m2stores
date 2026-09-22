import type { OrderStatus } from "@/models/Order";

/**
 * Single source of truth for order state transitions.
 * Customer transitions are restricted; admin can force ANY non-terminal transition.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "PAYMENT_RECEIVED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: ["PAYMENT_RECEIVED"],
  RETURN_REQUESTED: ["RETURN_APPROVED", "RETURN_REJECTED"],
  RETURN_APPROVED: ["RETURNED"],
  RETURN_REJECTED: [],
  RETURNED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
  PAYMENT_RECEIVED: ["REFUND_PENDING", "CONFIRMED"],
};

/** Terminal states — nothing can transition out of these. */
const TERMINAL: OrderStatus[] = ["RETURN_REJECTED", "REFUNDED"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

export function allowedNext(from: OrderStatus): OrderStatus[] {
  return [...(TRANSITIONS[from] || [])];
}

/** Admin can force ANY status change as long as the target is not the same as current and not from a terminal state. */
export function adminAllowedStatuses(): OrderStatus[] {
  return Object.keys(TRANSITIONS) as OrderStatus[];
}

export function isAdminTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (TERMINAL.includes(from)) return false;
  // SHIPPED→SHIPPED is handled separately as a location update, not a status transition
  if (from === "SHIPPED" && to === "SHIPPED") return false;
  return true;
}

/** Customer may only cancel (or request return — Phase 12); staff drive fulfillment. */
const CUSTOMER_ALLOWED: OrderStatus[] = ["CANCELLED"];
const CANCELLABLE_FROM: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "PACKED"];

export function customerCanCancel(from: OrderStatus): boolean {
  return CANCELLABLE_FROM.includes(from);
}

export function isCustomerTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "CANCELLED") return customerCanCancel(from);
  return false;
}

export function describeStatus(s: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    RETURN_REQUESTED: "Return requested",
    RETURN_APPROVED: "Return approved",
    RETURN_REJECTED: "Return rejected",
    RETURNED: "Returned",
    REFUND_PENDING: "Refund pending",
    REFUNDED: "Refunded",
    PAYMENT_RECEIVED: "Payment received - requires reconciliation",
  };
  return labels[s] || s;
}

/** Linear fulfillment timeline for tracking UI. */
export const FULFILLMENT_STEPS: OrderStatus[] = [
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export function timelineFor(status: OrderStatus, history: Array<{ status: OrderStatus; timestamp: Date | string }>) {
  const byStatus = new Map(history.map((h) => [h.status, h.timestamp]));
  const placedAt = byStatus.get("PENDING_PAYMENT") || byStatus.get("CONFIRMED");
  const steps = FULFILLMENT_STEPS.map((s) => ({
    status: s,
    label: describeStatus(s),
    timestamp: byStatus.get(s) || null,
    done: Boolean(byStatus.get(s)) || (s === "CONFIRMED" && ["PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].some((x) => byStatus.has(x as OrderStatus))),
  }));
  return { placedAt: placedAt || null, steps, terminal: status };
}

export { CUSTOMER_ALLOWED };
