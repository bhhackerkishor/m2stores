/**
 * Central metric definitions. Every analytics page MUST use these ids
 * so the same metric never means two different things.
 */
import type { RangeKey } from "./dates";

export type MetricId =
  | "gross_sales"
  | "net_sales"
  | "revenue"
  | "discounts"
  | "refunds"
  | "tax_collected"
  | "shipping_charged"
  | "cod_fees"
  | "orders"
  | "paid_orders"
  | "aov"
  | "units_sold"
  | "cogs"
  | "gross_profit"
  | "gross_margin_pct"
  | "contribution_profit"
  | "customers_total"
  | "customers_new"
  | "customers_returning"
  | "low_stock_skus"
  | "out_of_stock_skus"
  | "inventory_value"
  | "payment_success_rate"
  | "refund_rate"
  | "repeat_customer_rate"
  | "items_sold";

export interface MetricDef {
  id: MetricId;
  label: string;
  unit: "currency" | "count" | "percent" | "ratio";
  definition: string;
  caveat?: string;
}

export const METRICS: Record<MetricId, MetricDef> = {
  gross_sales: {
    id: "gross_sales",
    label: "Gross sales",
    unit: "currency",
    definition:
      "Sum of finalLineTotal over line items on paid, non-cancelled orders created in the selected range (before order-level coupon/offer discounts; excludes shipping, tax, COD fee).",
  },
  net_sales: {
    id: "net_sales",
    label: "Net sales",
    unit: "currency",
    definition:
      "Gross sales − order-level discounts (couponDiscount + offerDiscount) attributed to paid non-cancelled orders. Does not subtract refunds (see refunds).",
  },
  revenue: {
    id: "revenue",
    label: "Revenue (grand total)",
    unit: "currency",
    definition:
      "Sum of pricingSnapshot.grandTotal on paid, non-cancelled orders in range (includes shipping, tax, COD fee; after discounts).",
    caveat: "Primary top-line used on executive dashboard.",
  },
  discounts: {
    id: "discounts",
    label: "Discounts",
    unit: "currency",
    definition: "Sum of pricingSnapshot.couponDiscount + offerDiscount on paid non-cancelled orders in range.",
  },
  refunds: {
    id: "refunds",
    label: "Refunds",
    unit: "currency",
    definition:
      "Sum of Payment.refundDetails.amount where status is REFUNDED or PARTIALLY_REFUNDED, windowed on Payment.updatedAt.",
    caveat: "Single refund object per payment — successive partial refunds overwrite amount.",
  },
  tax_collected: {
    id: "tax_collected",
    label: "Tax collected",
    unit: "currency",
    definition: "Sum of pricingSnapshot.taxTotal on paid non-cancelled orders in range.",
  },
  shipping_charged: {
    id: "shipping_charged",
    label: "Shipping charged",
    unit: "currency",
    definition: "Sum of pricingSnapshot.shippingFee on paid non-cancelled orders in range.",
    caveat: "Customer-facing fee only — not merchant carrier cost (not stored).",
  },
  cod_fees: {
    id: "cod_fees",
    label: "COD fees",
    unit: "currency",
    definition: "Sum of pricingSnapshot.codFee on paid non-cancelled orders in range.",
  },
  orders: {
    id: "orders",
    label: "Orders",
    unit: "count",
    definition: "Count of all orders created in range (any payment/status).",
  },
  paid_orders: {
    id: "paid_orders",
    label: "Paid orders",
    unit: "count",
    definition: "Count of orders with paymentInfo.status = PAID and orderStatus ≠ CANCELLED in range.",
  },
  aov: {
    id: "aov",
    label: "Average order value",
    unit: "currency",
    definition: "Revenue (grand total) ÷ paid orders. Null when paid orders = 0.",
  },
  units_sold: {
    id: "units_sold",
    label: "Units sold",
    unit: "count",
    definition: "Sum of items.quantity on paid non-cancelled orders in range.",
  },
  items_sold: {
    id: "items_sold",
    label: "Items sold",
    unit: "count",
    definition: "Alias of units_sold.",
  },
  cogs: {
    id: "cogs",
    label: "COGS (estimated)",
    unit: "currency",
    definition:
      "Sum over sold units of Product.costPrice × quantity, joined live at query time from Product (product-level cost only).",
    caveat:
      "APPROXIMATE: uses current Product.costPrice, not a historical cost snapshot; no per-variant cost exists. Not accounting-grade.",
  },
  gross_profit: {
    id: "gross_profit",
    label: "Gross profit (estimated)",
    unit: "currency",
    definition: "Net sales − estimated COGS.",
    caveat: "Estimate only — see COGS caveat. Missing gateway fees, packaging, carrier costs.",
  },
  gross_margin_pct: {
    id: "gross_margin_pct",
    label: "Gross margin %",
    unit: "percent",
    definition: "Gross profit ÷ Net sales × 100. Null when net sales = 0.",
  },
  contribution_profit: {
    id: "contribution_profit",
    label: "Contribution (partial)",
    unit: "currency",
    definition:
      "Gross profit as computed above. True contribution (minus payment fees/shipping cost/packaging) is NOT calculable — those costs are not stored.",
    caveat: "Data unavailable for full contribution margin.",
  },
  customers_total: {
    id: "customers_total",
    label: "Customers",
    unit: "count",
    definition: "Count of users with role = CUSTOMER (all time).",
  },
  customers_new: {
    id: "customers_new",
    label: "New customers",
    unit: "count",
    definition: "CUSTOMER users created in range.",
  },
  customers_returning: {
    id: "customers_returning",
    label: "Returning customers",
    unit: "count",
    definition: "Distinct userIds with ≥1 paid order in range who also had ≥1 paid order before range start.",
  },
  low_stock_skus: {
    id: "low_stock_skus",
    label: "Low stock SKUs",
    unit: "count",
    definition: "InventoryState rows where (stock − reservedStock) < lowStockThreshold.",
  },
  out_of_stock_skus: {
    id: "out_of_stock_skus",
    label: "Out of stock SKUs",
    unit: "count",
    definition: "InventoryState rows where (stock − reservedStock) ≤ 0.",
  },
  inventory_value: {
    id: "inventory_value",
    label: "Inventory value (at cost)",
    unit: "currency",
    definition: "Sum over InventoryState of available units × Product.costPrice (live join).",
    caveat: "Uses current costPrice; products without costPrice contribute 0 and are flagged as unknown.",
  },
  payment_success_rate: {
    id: "payment_success_rate",
    label: "Payment success rate",
    unit: "percent",
    definition: "Payments with status PAID ÷ (PAID + FAILED + CANCELLED) × 100 in range (by Payment.createdAt).",
  },
  refund_rate: {
    id: "refund_rate",
    label: "Refund rate",
    unit: "percent",
    definition: "Refunded payment count ÷ paid order count × 100 in range. Null when paid orders = 0.",
  },
  repeat_customer_rate: {
    id: "repeat_customer_rate",
    label: "Repeat customer rate",
    unit: "percent",
    definition: "Customers with ≥2 paid orders (all time) ÷ customers with ≥1 paid order × 100.",
  },
};

export function metricDef(id: MetricId): MetricDef {
  return METRICS[id];
}

export interface MetricValue {
  id: MetricId;
  value: number | null;
  previous?: number | null;
  changePct?: number | null;
}

export function describeRange(r: { label: string; start: Date; end: Date; timezone: string; prevStart: Date; prevEnd: Date }) {
  return {
    label: r.label,
    start: r.start.toISOString(),
    end: r.end.toISOString(),
    comparisonLabel: "previous period",
    comparisonStart: r.prevStart.toISOString(),
    comparisonEnd: r.prevEnd.toISOString(),
    timezone: r.timezone,
  };
}

export type { RangeKey };
