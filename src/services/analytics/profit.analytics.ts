/**
 * Profit analytics — ESTIMATED only.
 * COGS joins live Product.costPrice (product-level). No gateway fees, packaging,
 * or carrier costs exist in the schema — those are reported as unavailable.
 */
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { InventoryState } from "@/models/Inventory";
import { resolveRange, roundMoney, type RangeKey, type ResolvedRange } from "@/lib/analytics/dates";
import { paidMatch } from "@/lib/analytics/matches";
import { RevenueAnalyticsService } from "./revenue.analytics";

export interface ProductProfitRow {
  productId: string;
  name: string;
  sku: string | null;
  category: string | null;
  units: number;
  grossSales: number;
  lineDiscounts: number;
  unitCost: number | null;
  cogs: number | null;
  grossProfit: number | null;
  marginPct: number | null;
  stock: number;
  inventoryValue: number | null;
}

export interface ProfitOverview {
  range: ResolvedRange;
  netSales: number;
  cogs: number | null;
  grossProfit: number | null;
  grossMarginPct: number | null;
  /** Always null with methodology — fees not stored. */
  paymentFees: null;
  shippingCost: null;
  packagingCost: null;
  contributionProfit: null;
  dataQuality: {
    cogsCoverage: "full" | "partial" | "none";
    productsMissingCost: number;
    productsSold: number;
    notes: string[];
  };
  revenue: number;
  refunds: number;
  topProfitProducts: ProductProfitRow[];
}

export class ProfitAnalyticsService {
  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<ProfitOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);
    const rev = await RevenueAnalyticsService.overview(range, from, to);

    // Unwind sold lines with productId + cost join
    const soldLines = await Order.aggregate([
      { $match: paidMatch(r) },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            productId: "$items.productId",
            name: "$items.nameSnapshot",
            sku: "$items.sku",
          },
          units: { $sum: "$items.quantity" },
          gross: { $sum: "$items.finalLineTotal" },
          lineDiscounts: { $sum: "$items.discountAmount" },
        },
      },
      { $sort: { gross: -1 } },
      { $limit: 200 },
    ]);

    const pids = soldLines.map((l: any) => l._id.productId).filter(Boolean);
    const products: any[] = pids.length
      ? await Product.find({ _id: { $in: pids } })
          .select("name costPrice categoryId baseSKU variants")
          .populate("categoryId", "name")
          .lean()
      : [];
    const prodMap = new Map(products.map((p: any) => [String(p._id), p]));

    const stockRows = pids.length
      ? await InventoryState.aggregate([
          { $match: { productId: { $in: pids } } },
          {
            $group: {
              _id: "$productId",
              stock: { $sum: "$stock" },
              reserved: { $sum: "$reservedStock" },
            },
          },
        ])
      : [];
    const stockMap = new Map(stockRows.map((s: any) => [String(s._id), s]));

    let cogsTotal = 0;
    let missingCost = 0;
    let productsSold = 0;
    const rows: ProductProfitRow[] = [];

    for (const line of soldLines as any[]) {
      const pid = String(line._id.productId);
      const p = prodMap.get(pid);
      const cost = p && typeof p.costPrice === "number" ? p.costPrice : null;
      productsSold++;
      if (cost === null) missingCost++;
      const lineCogs = cost !== null ? cost * line.units : null;
      if (lineCogs !== null) cogsTotal += lineCogs;
      const stock = stockMap.get(pid);
      const available = stock ? stock.stock - stock.reserved : 0;
      const invVal = cost !== null ? cost * Math.max(0, available) : null;
      const profit = cost !== null ? line.gross - lineCogs! : null;
      rows.push({
        productId: pid,
        name: line._id.name || p?.name || "Unknown",
        sku: line._id.sku || p?.baseSKU || null,
        category: (p?.categoryId as any)?.name || null,
        units: line.units,
        grossSales: roundMoney(line.gross),
        lineDiscounts: roundMoney(line.lineDiscounts || 0),
        unitCost: cost,
        cogs: lineCogs !== null ? roundMoney(lineCogs) : null,
        grossProfit: profit !== null ? roundMoney(profit) : null,
        marginPct: profit !== null && line.gross > 0 ? Math.round((profit / line.gross) * 1000) / 10 : null,
        stock: available,
        inventoryValue: invVal !== null ? roundMoney(invVal) : null,
      });
    }

    // Allocate order-level discounts roughly is NOT done — we use netSales vs cogs on line gross for margin honesty:
    // grossProfit estimate = (line gross − cogs) − order-level discounts (fully deducted once)
    const orderDiscounts = rev.discounts;
    const hasCost = missingCost < productsSold;
    const grossProfit = hasCost || cogsTotal > 0
      ? roundMoney(rev.grossSales - orderDiscounts - cogsTotal)
      : null;
    // Prefer netSales − cogs when netSales defined
    const netSales = rev.netSales;
    const grossProfit2 = missingCost < productsSold || cogsTotal > 0
      ? roundMoney(netSales - cogsTotal)
      : null;
    const profit = cogsTotal > 0 ? grossProfit2 : null;
    void grossProfit;

    const coverage: "full" | "partial" | "none" =
      productsSold === 0 ? "none" : missingCost === 0 ? "full" : missingCost >= productsSold ? "none" : "partial";

    const top = [...rows]
      .sort((a, b) => (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity))
      .slice(0, 15);

    return {
      range: r,
      netSales,
      cogs: cogsTotal > 0 ? roundMoney(cogsTotal) : coverage === "none" ? null : 0,
      grossProfit: profit,
      grossMarginPct: profit !== null && netSales > 0 ? Math.round((profit / netSales) * 1000) / 10 : null,
      paymentFees: null,
      shippingCost: null,
      packagingCost: null,
      contributionProfit: null,
      dataQuality: {
        cogsCoverage: coverage,
        productsMissingCost: missingCost,
        productsSold,
        notes: [
          "COGS uses current Product.costPrice (not historical cost snapshot).",
          "No per-variant costPrice — variant margins unavailable.",
          "Payment gateway fees, merchant shipping cost, and packaging cost are not stored — contribution/net profit not calculated.",
        ],
      },
      revenue: rev.revenue,
      refunds: rev.refunds,
      topProfitProducts: top,
    };
  }

  /** Inventory value at cost across all stocked SKUs. */
  static async inventoryValue() {
    await connectDB();
    const states = await InventoryState.find().select("productId stock reservedStock sku").lean();
    if (states.length === 0) {
      return { value: 0, knownCostSkus: 0, unknownCostSkus: 0, units: 0, methodology: "available × costPrice" };
    }
    const pids = [...new Set(states.map((s) => String(s.productId)))];
    const products = await Product.find({ _id: { $in: pids } }).select("costPrice").lean();
    const costMap = new Map(products.map((p: any) => [String(p._id), p.costPrice as number | undefined]));

    let value = 0;
    let known = 0;
    let unknown = 0;
    let units = 0;
    for (const s of states as any[]) {
      const avail = Math.max(0, s.stock - s.reservedStock);
      units += avail;
      const cost = costMap.get(String(s.productId));
      if (typeof cost === "number") {
        value += cost * avail;
        known++;
      } else {
        unknown++;
      }
    }
    return {
      value: roundMoney(value),
      knownCostSkus: known,
      unknownCostSkus: unknown,
      units,
      methodology: "Sum(available units × Product.costPrice). SKUs without costPrice excluded from value.",
    };
  }
}
