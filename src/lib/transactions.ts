import mongoose, { ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";

let replicaSetCapable: boolean | null = null;

/**
 * Detect whether the connected MongoDB supports multi-document transactions
 * (requires replica set or mongos). Caches the result per process.
 */
export async function supportsTransactions(): Promise<boolean> {
  if (replicaSetCapable !== null) return replicaSetCapable;
  try {
    await connectDB();
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      replicaSetCapable = false;
      return false;
    }
    const hello = await admin.command({ hello: 1 }).catch(() => admin.command({ ismaster: 1 }));
    const isReplica =
      Boolean((hello as any)?.setName) ||
      (hello as any)?.isWritablePrimary === true ||
      Array.isArray((hello as any)?.hosts);
    // Standalone mongod returns ok:1 with no setName and no hosts -> false
    replicaSetCapable = Boolean((hello as any)?.setName);
    // mongodb-memory-server replica set reports setName, standalone does not
    if (!replicaSetCapable && Array.isArray((hello as any)?.hosts) && (hello as any)?.setName) {
      replicaSetCapable = true;
    }
    return replicaSetCapable;
  } catch {
    replicaSetCapable = false;
    return false;
  }
}

export interface TxOptions {
  readConcern?: any;
  writeConcern?: any;
  maxCommitTimeMs?: number;
}

/**
 * Run fn inside a MongoDB transaction when the topology supports it.
 * Falls back to plain execution (with atomic conditional updates doing the
 * concurrency guarantee) on standalone dev instances.
 *
 * fn receives an optional session. Pass `session` into Mongoose ops that
 * accept it so they join the transaction when present.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>,
  opts?: TxOptions,
  maxRetries = 5
): Promise<T> {
  await connectDB();
  const canTx = await supportsTransactions();
  if (!canTx) {
    return fn(undefined);
  }
  let attempt = 0;
  // Retry transient errors (write conflicts, catalog changes on fresh collections)
  while (true) {
    attempt++;
    const session = await mongoose.startSession();
    session.startTransaction(opts as any);
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err: any) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.warn("Transaction abort failed", "db", { abortErr });
      }
      const msg = String(err?.message || err);
      const isTransient =
        err?.hasErrorLabel?.("TransientTransactionError") ||
        err?.code === 112 ||
        /catalog changes|TransientTransaction|WriteConflict|NoSuchTransaction/i.test(msg);
      if (isTransient && attempt < maxRetries) {
        logger.warn(`Transient transaction error, retrying (${attempt}/${maxRetries})`, "db", { msg });
        await new Promise((r) => setTimeout(r, 100 * attempt));
        continue;
      }
      throw err;
    } finally {
      session.endSession();
    }
  }
}

// Test-only helper to reset cached detection (e.g. switching between memory servers)
export function __resetTxCache() {
  replicaSetCapable = null;
}
