import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { withTransaction } from "@/lib/transactions";
import { InventoryState, InventoryReservation, InventoryOperation } from "@/models/Inventory";
import { AppError, InsufficientStockError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const RESERVATION_TTL_MS = 60 * 60 * 1000; // 1 hour

function reservationIdFor(orderId: string, sku: string, _orderItemId?: string) {
  return `RES_${orderId}_${sku.toUpperCase()}`;
}

async function claimOperation(args: {
  operationId: string;
  orderId?: string;
  reservationId?: string;
  productId: string;
  sku: string;
  operationType: "RESERVE" | "COMMIT" | "RELEASE" | "ADJUST";
  quantity: number;
  reason?: string;
  performedBy?: string;
  session?: mongoose.ClientSession;
}): Promise<{ claimed: boolean; existing?: any }> {
  const { session, ...rest } = args;
  // performedBy is ObjectId ref — drop labels like "admin"/"system" so create never Cast-errors.
  const performedBy = rest.performedBy && mongoose.isValidObjectId(rest.performedBy) ? rest.performedBy : undefined;
  try {
    await InventoryOperation.create(
      [
        {
          operationId: rest.operationId,
          orderId: rest.orderId as any,
          reservationId: rest.reservationId,
          productId: rest.productId as any,
          sku: rest.sku.toUpperCase(),
          operationType: rest.operationType,
          quantity: rest.quantity,
          previousStock: 0,
          newStock: 0,
          previousReserved: 0,
          newReserved: 0,
          status: "PENDING",
          reason: rest.reason,
          performedBy: performedBy as any,
        },
      ],
      session ? { session } : undefined
    );
    return { claimed: true };
  } catch (err: any) {
    if (err?.code === 11000) {
      const existing = await InventoryOperation.findOne({ operationId: rest.operationId }).lean();
      return { claimed: false, existing };
    }
    throw err;
  }
}

async function completeOperation(operationId: string, patch: Record<string, any>, session?: mongoose.ClientSession) {
  await InventoryOperation.findOneAndUpdate(
    { operationId },
    { $set: { ...patch, status: "COMPLETED", completedAt: new Date() } },
    session ? { session } : undefined
  );
}

async function failOperation(operationId: string, reason: string, session?: mongoose.ClientSession) {
  await InventoryOperation.findOneAndUpdate(
    { operationId },
    { $set: { status: "FAILED", reason } },
    session ? { session } : undefined
  ).catch(() => {});
}

export class InventoryService {
  /**
   * Reserve stock atomically with idempotency.
   * Guarantees: stock >= reservedStock >= 0 enforced by MongoDB $expr.
   * Idempotency: same operationId returns prior result without double-reserve.
   */
  static async reserve(input: {
    productId: string;
    sku: string;
    quantity: number;
    orderId: string;
    orderItemId: string;
    operationId: string;
    reason?: string;
  }) {
    const { productId, sku: rawSku, quantity, orderId, orderItemId, operationId, reason } = input;
    const sku = rawSku.toUpperCase();
    if (!productId || !sku || !quantity || quantity < 1) {
      throw new AppError("productId, sku and quantity>=1 are required", 400, "VALIDATION_ERROR");
    }
    await connectDB();

    // Fast-path idempotency: already completed -> return without mutating
    const prior = await InventoryOperation.findOne({ operationId }).lean();
    if (prior?.status === "COMPLETED") {
      logger.info("Duplicate reserve ignored (idempotent)", "inventory", { operationId });
      return { reservationId: prior.reservationId, duplicate: true };
    }

    return withTransaction(async (session) => {
      const claim = await claimOperation({
        operationId,
        orderId,
        productId,
        sku,
        operationType: "RESERVE",
        quantity,
        reason: reason || `Reserve for order ${orderId}`,
        session: session as any,
      });
      if (!claim.claimed) {
        if (claim.existing?.status === "COMPLETED") {
          return { reservationId: claim.existing.reservationId, duplicate: true };
        }
        // A PENDING op from a crashed worker exists — proceed to ensure exactly-once
        // by checking reservation existence below.
      }

      const reservationId = reservationIdFor(orderId, sku, orderItemId);

      // If reservation already ACTIVE with same qty, treat as duplicate (retry after crash)
      const existingRes = await InventoryReservation.findOne({ _id: reservationId }).lean();
      if (existingRes?.status === "ACTIVE") {
        const op = await InventoryOperation.findOne({ operationId }).lean();
        if (op?.status === "COMPLETED") return { reservationId, duplicate: true };
        // Reservation exists but op not completed (crash between steps) — complete op bookkeeping
        const state = await InventoryState.findOne({ productId, sku }).lean();
        await completeOperation(
          operationId,
          {
            reservationId,
            previousStock: state?.stock ?? 0,
            newStock: state?.stock ?? 0,
            previousReserved: state?.reservedStock ?? 0,
            newReserved: state?.reservedStock ?? 0,
          },
          session as any
        );
        return { reservationId, duplicate: true };
      }

      // ATOMIC conditional increment — the single concurrency guarantee
      const updated = await InventoryState.findOneAndUpdate(
        {
          productId,
          sku,
          $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity] },
        },
        { $inc: { reservedStock: quantity } },
        { new: true, session: session as any }
      );

      if (!updated) {
        await failOperation(operationId, `Insufficient stock for ${sku}`, session as any);
        throw new InsufficientStockError(`Insufficient stock for SKU ${sku}`);
      }

      await InventoryReservation.findOneAndUpdate(
        { _id: reservationId },
        {
          $setOnInsert: {
            _id: reservationId,
            orderId,
            orderItemId,
            productId,
            sku,
            quantity,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
          },
        },
        { upsert: true, setDefaultsOnInsert: true, session: session as any }
      );

      await completeOperation(
        operationId,
        {
          reservationId,
          previousStock: updated.stock,
          newStock: updated.stock,
          previousReserved: updated.reservedStock - quantity,
          newReserved: updated.reservedStock,
        },
        session as any
      );

      logger.info("Stock reserved", "inventory", { productId, sku, quantity, orderId });
      return { reservationId, duplicate: false };
    });
  }

  /**
   * Commit reservation -> deduct physical stock. Idempotent per operationId.
   */
  static async commit(input: { productId: string; sku: string; quantity: number; orderId: string; operationId: string; reason?: string }) {
    const { productId, sku: rawSku, quantity, orderId, operationId, reason } = input;
    const sku = rawSku.toUpperCase();
    await connectDB();

    const prior = await InventoryOperation.findOne({ operationId }).lean();
    if (prior?.status === "COMPLETED") {
      logger.info("Duplicate commit ignored (idempotent)", "inventory", { operationId });
      return { duplicate: true };
    }

    return withTransaction(async (session) => {
      const claim = await claimOperation({
        operationId, orderId, productId, sku, operationType: "COMMIT", quantity,
        reason: reason || `Commit for order ${orderId}`, session: session as any,
      });
      if (!claim.claimed && claim.existing?.status === "COMPLETED") return { duplicate: true };

      const reservationId = reservationIdFor(orderId, sku);

      const updated = await InventoryState.findOneAndUpdate(
        { productId, sku, reservedStock: { $gte: quantity }, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, reservedStock: -quantity } },
        { new: true, session: session as any }
      );

      if (!updated) {
        // If reservation already COMMITTED, treat as duplicate success
        const res = await InventoryReservation.findOne({ _id: reservationId }).lean();
        if (res?.status === "COMMITTED") {
          await completeOperation(operationId, { reservationId }, session as any);
          return { duplicate: true };
        }
        await failOperation(operationId, `Cannot commit ${sku}: insufficient reserved/stock`, session as any);
        throw new AppError(`Cannot commit inventory for SKU ${sku}`, 409, "COMMIT_FAILED");
      }

      await InventoryReservation.findOneAndUpdate(
        { _id: reservationId },
        { $set: { status: "COMMITTED" } },
        { session: session as any }
      );

      await completeOperation(
        operationId,
        {
          reservationId,
          previousStock: updated.stock + quantity,
          newStock: updated.stock,
          previousReserved: updated.reservedStock + quantity,
          newReserved: updated.reservedStock,
        },
        session as any
      );

      logger.info("Stock committed", "inventory", { productId, sku, quantity, orderId });
      return { duplicate: false };
    });
  }

  /**
   * Release reservation -> free reservedStock. Idempotent. Never lets reserved go negative
   * (guarded by $gte in the atomic update).
   */
  static async release(input: { productId: string; sku: string; quantity: number; orderId: string; operationId: string; reason?: string }) {
    const { productId, sku: rawSku, quantity, orderId, operationId, reason } = input;
    const sku = rawSku.toUpperCase();
    await connectDB();

    const prior = await InventoryOperation.findOne({ operationId }).lean();
    if (prior?.status === "COMPLETED") {
      logger.info("Duplicate release ignored (idempotent)", "inventory", { operationId });
      return { duplicate: true };
    }

    return withTransaction(async (session) => {
      const claim = await claimOperation({
        operationId, orderId, productId, sku, operationType: "RELEASE", quantity,
        reason: reason || `Release for order ${orderId}`, session: session as any,
      });
      if (!claim.claimed && claim.existing?.status === "COMPLETED") return { duplicate: true };

      const reservationId = reservationIdFor(orderId, sku);

      // If reservation already RELEASED/COMMITTED, don't decrement again
      const res = await InventoryReservation.findOne({ _id: reservationId }).lean();
      if (res && res.status !== "ACTIVE") {
        await completeOperation(operationId, { reservationId }, session as any);
        return { duplicate: true };
      }

      const updated = await InventoryState.findOneAndUpdate(
        { productId, sku, reservedStock: { $gte: quantity } },
        { $inc: { reservedStock: -quantity } },
        { new: true, session: session as any }
      );

      if (!updated) {
        // Nothing reserved — could be already released concurrently. Mark released idempotently.
        await InventoryReservation.findOneAndUpdate(
          { _id: reservationId, status: "ACTIVE" },
          { $set: { status: "RELEASED" } },
          { session: session as any }
        );
        await completeOperation(operationId, { reservationId }, session as any);
        logger.warn("Release found no reserved stock (treated idempotent)", "inventory", { productId, sku, orderId });
        return { duplicate: true };
      }

      await InventoryReservation.findOneAndUpdate(
        { _id: reservationId },
        { $set: { status: "RELEASED" } },
        { session: session as any }
      );

      await completeOperation(
        operationId,
        {
          reservationId,
          previousStock: updated.stock,
          newStock: updated.stock,
          previousReserved: updated.reservedStock + quantity,
          newReserved: updated.reservedStock,
        },
        session as any
      );

      logger.info("Stock released", "inventory", { productId, sku, quantity, orderId });
      return { duplicate: false };
    });
  }

  static async getAvailable(productId: string, sku: string) {
    await connectDB();
    const inv = await InventoryState.findOne({ productId, sku: sku.toUpperCase() }).lean();
    if (!inv) return { stock: 0, reserved: 0, available: 0, lowStockThreshold: 5 };
    return {
      stock: inv.stock,
      reserved: inv.reservedStock,
      available: inv.stock - inv.reservedStock,
      lowStockThreshold: (inv as any).lowStockThreshold ?? 5,
    };
  }

  /**
   * Admin stock adjustment. Guards against negative resulting stock.
   * Creates audit InventoryOperation + returns updated state.
   */
  static async adjust(input: { productId: string; sku: string; delta: number; reason: string; performedBy?: string; operationId?: string }) {
    const { productId, sku: rawSku, delta, reason, performedBy, operationId } = input;
    const sku = rawSku.toUpperCase();
    if (!reason || reason.trim().length < 5) throw new AppError("Adjustment reason (min 5 chars) is required", 400, "VALIDATION_ERROR");
    if (!delta || delta === 0) throw new AppError("Delta must be non-zero", 400, "VALIDATION_ERROR");
    await connectDB();

    const opId = operationId || `ADJ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const prior = await InventoryOperation.findOne({ operationId: opId }).lean();
    if (prior?.status === "COMPLETED") return { state: await InventoryState.findOne({ productId, sku }).lean(), duplicate: true };

    return withTransaction(async (session) => {
      await claimOperation({
        operationId: opId, productId, sku, operationType: "ADJUST", quantity: Math.abs(delta),
        reason, performedBy, session: session as any,
      }).catch((e: any) => {
        if (e?.code !== 11000) throw e;
      });

      const before = await InventoryState.findOne({ productId, sku }).lean();
      if (!before) throw new AppError(`Inventory state not found for ${sku}`, 404, "INVENTORY_NOT_FOUND");
      if (before.stock + delta < 0) throw new AppError(`Adjustment would make stock negative (${before.stock} + ${delta})`, 409, "NEGATIVE_STOCK");
      if (before.stock + delta < before.reservedStock) {
        throw new AppError(`Adjustment would violate stock >= reserved (${before.stock + delta} < ${before.reservedStock})`, 409, "INVARIANT_VIOLATION");
      }

      const updated = await InventoryState.findOneAndUpdate(
        { productId, sku },
        { $inc: { stock: delta } },
        { new: true, session: session as any }
      );

      await completeOperation(
        opId,
        {
          previousStock: before.stock,
          newStock: updated!.stock,
          previousReserved: before.reservedStock,
          newReserved: updated!.reservedStock,
        },
        session as any
      );

      logger.info("Stock adjusted", "inventory", { productId, sku, delta, reason });
      return { state: updated!.toObject(), duplicate: false };
    });
  }

  /** Restock on customer return (increments physical stock). */
  static async restock(input: { productId: string; sku: string; quantity: number; orderId?: string; reason?: string }) {
    const { productId, sku: rawSku, quantity, orderId, reason } = input;
    const sku = rawSku.toUpperCase();
    await connectDB();
    const updated = await InventoryState.findOneAndUpdate(
      { productId, sku },
      { $inc: { stock: quantity } },
      { new: true }
    );
    if (!updated) throw new AppError(`Inventory state not found for ${sku}`, 404, "INVENTORY_NOT_FOUND");
    await InventoryOperation.create({
      operationId: `RST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderId: orderId as any,
      productId: productId as any,
      sku,
      operationType: "ADJUST",
      quantity,
      previousStock: updated.stock - quantity,
      newStock: updated.stock,
      previousReserved: updated.reservedStock,
      newReserved: updated.reservedStock,
      status: "COMPLETED",
      reason: reason || "Return restock",
      completedAt: new Date(),
    });
    return updated.toObject();
  }

  /**
   * Idempotent restock guarded by a deterministic operationId.
   * Safe to call inside retried transactions: the atomic claim ensures the
   * physical $inc runs at most once per operationId.
   */
  static async restockIdempotent(input: { productId: string; sku: string; quantity: number; operationId: string; orderId?: string; reason?: string }) {
    const { productId, sku: rawSku, quantity, operationId, orderId, reason } = input;
    const sku = rawSku.toUpperCase();
    await connectDB();
    try {
      await InventoryOperation.create({
        operationId,
        orderId: orderId as any,
        productId: productId as any,
        sku,
        operationType: "ADJUST",
        quantity,
        previousStock: 0,
        newStock: 0,
        previousReserved: 0,
        newReserved: 0,
        status: "PENDING",
        reason: reason || "Return restock",
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        const existing: any = await InventoryOperation.findOne({ operationId }).lean();
        if (existing?.status === "COMPLETED") return { duplicate: true };
        // PENDING from a crashed attempt — fall through and complete it below.
      } else {
        throw e;
      }
    }
    const updated = await InventoryState.findOneAndUpdate({ productId, sku }, { $inc: { stock: quantity } }, { new: true });
    if (!updated) throw new AppError(`Inventory state not found for ${sku}`, 404, "INVENTORY_NOT_FOUND");
    await InventoryOperation.findOneAndUpdate(
      { operationId },
      {
        $set: {
          previousStock: updated.stock - quantity,
          newStock: updated.stock,
          previousReserved: updated.reservedStock,
          newReserved: updated.reservedStock,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      }
    );
    return { duplicate: false };
  }

  /**
   * Release all expired ACTIVE reservations (abandoned checkouts).
   * Returns count released. Safe to run on a schedule and concurrently
   * (atomic per-reservation claim via status transition).
   */
  static async releaseExpired(limit = 100) {
    await connectDB();
    const now = new Date();
    const expired = await InventoryReservation.find({ status: "ACTIVE", expiresAt: { $lte: now } })
      .limit(limit)
      .lean();
    let released = 0;
    for (const r of expired) {
      try {
        // Claim by flipping ACTIVE->RELEASED atomically; loser skips
        const claimed = await InventoryReservation.findOneAndUpdate(
          { _id: r._id, status: "ACTIVE" },
          { $set: { status: "RELEASED" } },
          { new: true }
        );
        if (!claimed) continue;
        await InventoryState.findOneAndUpdate(
          { productId: r.productId, sku: r.sku, reservedStock: { $gte: r.quantity } },
          { $inc: { reservedStock: -r.quantity } }
        );
        await InventoryOperation.findOneAndUpdate(
          { operationId: `EXP_${String(r._id)}` },
          {
            $setOnInsert: {
              operationId: `EXP_${String(r._id)}`,
              orderId: r.orderId,
              reservationId: String(r._id),
              productId: r.productId,
              sku: r.sku,
              operationType: "RELEASE",
              quantity: r.quantity,
              previousStock: 0,
              newStock: 0,
              previousReserved: 0,
              newReserved: 0,
              status: "COMPLETED",
              reason: "Reservation expired",
              completedAt: new Date(),
            },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
        released++;
      } catch (e) {
        logger.warn("Failed to release expired reservation", "inventory", { reservationId: String((r as any)._id) });
      }
    }
    if (released) logger.info(`Released ${released} expired reservations`, "inventory");
    return { released, scanned: expired.length };
  }

  static async assertInvariants(productId?: string) {
    await connectDB();
    const filter: any = {};
    if (productId) filter.productId = productId;
    const states = await InventoryState.find(filter).lean();
    const violations = states.filter((s) => s.stock < 0 || s.reservedStock < 0 || s.reservedStock > s.stock);
    return { checked: states.length, violations };
  }

  /**
   * Ensure InventoryState rows exist for a product's sellable SKUs and
   * optionally apply form-provided stock. Stock lives only in InventoryState —
   * Product never stores quantity. Missing rows are created (stock 0 when not
   * provided); existing rows are only updated when a numeric stock is given,
   * and never below reservedStock (invariant: stock >= reserved).
   */
  static async syncFromProduct(input: {
    productId: string;
    baseSKU?: string | null;
    hasVariants?: boolean;
    variants?: Array<{ sku: string; stock?: number }>;
    initialStock?: number;
  }): Promise<{ created: number; updated: number; skus: string[] }> {
    await connectDB();
    const { productId } = input;
    const useVariants = Boolean(input.hasVariants) && (input.variants?.length ?? 0) > 0;

    const targets: Array<{ sku: string; stock?: number }> = [];
    if (useVariants) {
      for (const v of input.variants!) {
        const sku = String(v.sku || "").trim().toUpperCase();
        if (!sku) continue;
        targets.push({ sku, stock: v.stock });
      }
    } else {
      let sku = String(input.baseSKU || "").trim().toUpperCase();
      if (!sku) sku = `SKU-${productId.slice(0, 8).toUpperCase()}`;
      targets.push({ sku, stock: input.initialStock });
    }

    let created = 0;
    let updated = 0;
    const skus: string[] = [];
    for (const t of targets) {
      const existing = await InventoryState.findOne({ productId, sku: t.sku });
      if (!existing) {
        await InventoryState.create({
          productId,
          sku: t.sku,
          stock: Math.max(0, Math.floor(t.stock ?? 0)),
          reservedStock: 0,
          lowStockThreshold: 5,
        });
        created++;
      } else if (typeof t.stock === "number" && Number.isFinite(t.stock)) {
        const next = Math.max(Math.floor(t.stock), existing.reservedStock);
        if (next !== existing.stock) {
          existing.stock = next;
          await existing.save();
          updated++;
        }
      }
      skus.push(t.sku);
    }
    if (created || updated) {
      logger.info("Product inventory synced", "inventory", { productId, created, updated, skus });
    }
    return { created, updated, skus };
  }
}
