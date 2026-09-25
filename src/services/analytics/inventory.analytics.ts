/**
 * Inventory analytics — stock health, movement, valuation (read-only).
 * Source of truth: InventoryState + InventoryOperation (+ Product.costPrice for value).
 */
import { connectDB } from "@/lib/db";
import { InventoryState, InventoryOperation } from "@/models/Inventory";
import { Product } from "@/models/Product";
import { resolveRange, roundMoney, pctChange, type RangeKey, type ResolvedRange } from "@/lib/analytics/dates";

export interface StockHealth {
  available: number;
  reserved: number;
  totalUnits: number;
  health: "out" | "critical" | "low" | "healthy";
}

export interface InventoryOverview {
  range: ResolvedRange;
  totals: {
    skus: number;
    availableUnits: number;
    reservedUnits: number;
    totalUnits: number;
    inStockSkus: number;
    lowStockSkus: number;
    outOfStockSkus: number;
    unknownCostSkus: number;
    inventoryValue: number;
    operations: number;
    previousOperations: number;
    operationsPct: number | null;
  };
  byHealth: Array<{ health: string; skus: number; units: number }>;
  lowStock: Array<{
    inventoryId: string;
    productId: string;
    productName: string;
    sku: string;
    variantName: string | null;
    available: number;
    reserved: number;
    stock: number;
    threshold: number;
    health: StockHealth["health"];
    unitCost: number | null;
    inventoryValue: number | null;
  }>;
  deadStock: Array<{
    inventoryId: string;
    productId: string;
    productName: string;
    sku: string;
    available: number;
    unitCost: number | null;
    lastMovementAt: string | null;
    daysSinceMovement: number | null;
  }>;
  movements: Array<{
    date: string;
    in: number;
    out: number;
    adjust: number;
    reserve: number;
    release: number;
  }>;
  movementTypes: Array<{ type: string; count: number; quantity: number }>;
}

function healthOf(available: number, threshold: number): StockHealth["health"] {
  if (available <= 0) return "out";
  if (available < threshold) return "critical";
  if (available <= threshold) return "low";
  return "healthy";
}

export class InventoryAnalyticsService {
  static async overview(range: RangeKey = "30d", from?: string, to?: string): Promise<InventoryOverview> {
    await connectDB();
    const r = resolveRange(range, from, to);

    const [states, prodCount, opsInRange, opsPrev, movements, typeAgg, lastMoveByProduct] = await Promise.all([
      InventoryState.find()
        .select("productId sku variantName stock reservedStock lowStockThreshold lastMovementAt")
        .lean(),
      Product.countDocuments(),
      InventoryOperation.countDocuments({ createdAt: { $gte: r.start, $lte: r.end } }),
      InventoryOperation.countDocuments({ createdAt: { $gte: r.prevStart, $lte: r.prevEnd } }),
      InventoryOperation.find({ createdAt: { $gte: r.start, $lte: r.end } })
        .select("operationType quantity createdAt")
        .sort({ createdAt: 1 })
        .lean(),
      InventoryOperation.aggregate([
        { $match: { createdAt: { $gte: r.start, $lte: r.end } } },
        {
          $group: {
            _id: "$operationType",
            count: { $sum: 1 },
            quantity: { $sum: { $abs: "$quantity" } },
          },
        },
      ]),
      InventoryOperation.aggregate([
        { $match: { createdAt: { $lte: r.end } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$productId", last: { $first: "$createdAt" } } },
      ]),
    ]);

    const pids = [...new Set(states.map((s) => String(s.productId)))];
    const products = pids.length
      ? await Product.find({ _id: { $in: pids } }).select("name costPrice").lean()
      : [];
    const prodMap = new Map(products.map((p: any) => [String(p._id), p]));
    const lastMoveMap = new Map((lastMoveByProduct as any[]).map((m) => [String(m._id), m.last]));

    let availableUnits = 0;
    let reservedUnits = 0;
    let value = 0;
    let unknownCost = 0;
    let inStock = 0;
    let low = 0;
    let out = 0;
    const byHealthMap = new Map<string, { skus: number; units: number }>();
    const lowStock: InventoryOverview["lowStock"] = [];
    const now = Date.now();

    for (const s of states as any[]) {
      const avail = s.stock - s.reservedStock;
      const thr = s.lowStockThreshold ?? 5;
      const h = healthOf(avail, thr);
      availableUnits += Math.max(0, avail);
      reservedUnits += s.reservedStock || 0;
      const p = prodMap.get(String(s.productId));
      const cost = p && typeof p.costPrice === "number" ? p.costPrice : null;
      if (cost === null) unknownCost++;
      else value += cost * Math.max(0, avail);

      if (h === "out") out++;
      else if (h === "critical" || h === "low") low++;
      else inStock++;

      const bucket = byHealthMap.get(h) || { skus: 0, units: 0 };
      bucket.skus++;
      bucket.units += Math.max(0, avail);
      byHealthMap.set(h, bucket);

      if (h === "out" || h === "critical" || h === "low") {
        lowStock.push({
          inventoryId: String(s._id),
          productId: String(s.productId),
          productName: p?.name || "Unknown product",
          sku: s.sku,
          variantName: s.variantName || null,
          available: avail,
          reserved: s.reservedStock || 0,
          stock: s.stock,
          threshold: thr,
          health: h,
          unitCost: cost,
          inventoryValue: cost !== null ? roundMoney(cost * Math.max(0, avail)) : null,
        });
      }
    }
    lowStock.sort((a, b) => a.available - b.available);

    // Dead stock: available > 0, no inventory op in range (use lastMovementAt / last op)
    const deadStock: InventoryOverview["deadStock"] = [];
    for (const s of states as any[]) {
      const avail = s.stock - s.reservedStock;
      if (avail <= 0) continue;
      const last = s.lastMovementAt || lastMoveMap.get(String(s.productId)) || null;
      const lastMs = last ? new Date(last).getTime() : null;
      const sinceRange = !lastMs || lastMs < r.start.getTime();
      if (!sinceRange) continue;
      const p = prodMap.get(String(s.productId));
      const cost = p && typeof p.costPrice === "number" ? p.costPrice : null;
      deadStock.push({
        inventoryId: String(s._id),
        productId: String(s.productId),
        productName: p?.name || "Unknown product",
        sku: s.sku,
        available: avail,
        unitCost: cost,
        lastMovementAt: lastMs ? new Date(lastMs).toISOString() : null,
        daysSinceMovement: lastMs ? Math.floor((now - lastMs) / 86400000) : null,
      });
    }
    deadStock.sort((a, b) => (b.daysSinceMovement ?? 9999) - (a.daysSinceMovement ?? 9999));
    deadStock.splice(15);

    const moveByDay = new Map<string, { in: number; out: number; adjust: number; reserve: number; release: number }>();
    for (const op of movements as any[]) {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(op.createdAt));
      const row = moveByDay.get(key) || { in: 0, out: 0, adjust: 0, reserve: 0, release: 0 };
      const q = Math.abs(op.quantity || 0);
      const t = op.operationType || "ADJUST";
      if (t === "COMMIT") row.out += q;
      else if (t === "ADJUST") row.adjust += q;
      else if (t === "RESERVE") row.reserve += q;
      else if (t === "RELEASE") row.release += q;
      else row.adjust += q;
      moveByDay.set(key, row);
    }
    const movementSeries: InventoryOverview["movements"] = [];
    for (let i = 0; i < r.days; i++) {
      const d = new Date(r.start.getTime() + i * 86400000);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      const row = moveByDay.get(key) || { in: 0, out: 0, adjust: 0, reserve: 0, release: 0 };
      movementSeries.push({ date: key, ...row });
    }

    return {
      range: r,
      totals: {
        skus: states.length,
        availableUnits,
        reservedUnits,
        totalUnits: availableUnits + reservedUnits,
        inStockSkus: inStock,
        lowStockSkus: low,
        outOfStockSkus: out,
        unknownCostSkus: unknownCost,
        inventoryValue: roundMoney(value),
        operations: opsInRange,
        previousOperations: opsPrev,
        operationsPct: pctChange(opsInRange, opsPrev),
      },
      byHealth: [...byHealthMap.entries()].map(([health, v]) => ({ health, skus: v.skus, units: v.units })),
      lowStock,
      deadStock,
      movements: movementSeries,
      movementTypes: typeAgg.map((t: any) => ({
        type: t._id || "UNKNOWN",
        count: t.count,
        quantity: t.quantity,
      })),
    };
  }

}
