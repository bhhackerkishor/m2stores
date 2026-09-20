/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { InventoryState, InventoryReservation, InventoryOperation } from "../models/Inventory";
import { InventoryService } from "../services/inventory.service";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed++;
  console.log(`✅ PASS: ${name}`);
}
function fail(name: string, err: unknown) {
  failed++;
  console.error(`❌ FAIL: ${name}`, err instanceof Error ? err.message : err);
}

const newOid = () => new mongoose.Types.ObjectId().toString();

async function assertInvariants(tag: string) {
  const states: any[] = await InventoryState.find().lean();
  for (const s of states) {
    if (s.stock < 0 || s.reservedStock < 0 || s.reservedStock > s.stock) {
      throw new Error(`Invariant violated at ${tag}: sku=${s.sku} stock=${s.stock} reserved=${s.reservedStock}`);
    }
  }
}

async function resetState(productId: mongoose.Types.ObjectId, sku: string, stock: number) {
  await InventoryState.findOneAndUpdate(
    { productId, sku },
    { $set: { stock, reservedStock: 0 } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await InventoryReservation.deleteMany({ productId, sku });
}

async function main() {
  console.log("🧪 Starting inventory concurrency tests (in-memory replica set)...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  const uri = replset.getUri();
  __resetTxCache();
  await mongoose.connect(uri);
  console.log(`✅ Connected to ${uri}`);

  const productId = new mongoose.Types.ObjectId();
  const SKU = "TEST-001";
  const pid = String(productId);

  try {
    // 1. Reserve last unit
    try {
      await InventoryState.deleteMany({});
      await InventoryOperation.deleteMany({});
      await InventoryReservation.deleteMany({});
      await InventoryState.create({ productId, sku: SKU, stock: 1, reservedStock: 0, lowStockThreshold: 5 });
      const orderId = newOid();
      const r: any = await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 1, orderId, orderItemId: "ITEM-1", operationId: "OP-RES-1" });
      if (!r.reservationId) throw new Error("no reservationId");
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.reservedStock !== 1) throw new Error(`expected reserved=1 got ${st!.reservedStock}`);
      await assertInvariants("reserve-last-unit");
      ok("reserve last unit");
    } catch (e) { fail("reserve last unit", e); }

    // 2. Two concurrent reservations for last unit — only one succeeds
    try {
      await resetState(productId, SKU, 1);
      await InventoryOperation.deleteMany({ operationId: { $in: ["OP-CONC-A", "OP-CONC-B"] } });
      const orderA = newOid();
      const orderB = newOid();
      const results = await Promise.allSettled([
        InventoryService.reserve({ productId: pid, sku: SKU, quantity: 1, orderId: orderA, orderItemId: "A", operationId: "OP-CONC-A" }),
        InventoryService.reserve({ productId: pid, sku: SKU, quantity: 1, orderId: orderB, orderItemId: "B", operationId: "OP-CONC-B" }),
      ]);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.filter((r) => r.status === "rejected").length;
      if (succeeded !== 1 || rejected !== 1) throw new Error(`expected 1 success/1 fail, got ${succeeded}/${rejected}`);
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.reservedStock !== 1) throw new Error(`expected reserved=1, got ${st!.reservedStock}`);
      await assertInvariants("concurrent-last-unit");
      ok("two concurrent reservations for last unit (exactly one wins)");
    } catch (e) { fail("two concurrent reservations for last unit", e); }

    // 3. Insufficient stock
    try {
      await resetState(productId, SKU, 1);
      let threw = false;
      try {
        await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 5, orderId: newOid(), orderItemId: "X", operationId: "OP-OVER-1" });
      } catch (err: any) {
        if (err?.code === "INSUFFICIENT_STOCK") threw = true;
      }
      if (!threw) throw new Error("expected INSUFFICIENT_STOCK");
      await assertInvariants("insufficient-stock");
      ok("insufficient stock rejected");
    } catch (e) { fail("insufficient stock rejected", e); }

    // 4. Commit flow
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 2, orderId, orderItemId: "C", operationId: "OP-RES-C" });
      await InventoryService.commit({ productId: pid, sku: SKU, quantity: 2, orderId, operationId: "OP-COM-C" });
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.stock !== 3 || st!.reservedStock !== 0) throw new Error(`expected stock=3 reserved=0, got ${st!.stock}/${st!.reservedStock}`);
      const res: any = await InventoryReservation.findOne({ orderId: new mongoose.Types.ObjectId(orderId) }).lean();
      if (res?.status !== "COMMITTED") throw new Error(`expected COMMITTED, got ${res?.status}`);
      await assertInvariants("commit");
      ok("commit deducts stock + reserved");
    } catch (e) { fail("commit deducts stock + reserved", e); }

    // 5. Release flow
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 2, orderId, orderItemId: "R", operationId: "OP-RES-R" });
      await InventoryService.release({ productId: pid, sku: SKU, quantity: 2, orderId, operationId: "OP-REL-R" });
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.stock !== 5 || st!.reservedStock !== 0) throw new Error(`expected 5/0, got ${st!.stock}/${st!.reservedStock}`);
      await assertInvariants("release");
      ok("release frees reserved stock");
    } catch (e) { fail("release frees reserved stock", e); }

    // 6. Duplicate reserve operationId is idempotent
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      const first: any = await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 2, orderId, orderItemId: "D", operationId: "OP-DUP-1" });
      const second: any = await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 2, orderId, orderItemId: "D", operationId: "OP-DUP-1" });
      if (!second.duplicate) throw new Error("second call should be duplicate");
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.reservedStock !== 2) throw new Error(`double-reserve detected: reserved=${st!.reservedStock}`);
      void first;
      await assertInvariants("duplicate-reserve");
      ok("duplicate reserve operationId is idempotent");
    } catch (e) { fail("duplicate reserve operationId is idempotent", e); }

    // 7. Duplicate commit is idempotent (webhook retry simulation)
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 1, orderId, orderItemId: "W", operationId: "OP-RES-W" });
      await InventoryService.commit({ productId: pid, sku: SKU, quantity: 1, orderId, operationId: "OP-COM-W" });
      const second: any = await InventoryService.commit({ productId: pid, sku: SKU, quantity: 1, orderId, operationId: "OP-COM-W" });
      if (!second.duplicate) throw new Error("second commit should be duplicate");
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.stock !== 4) throw new Error(`double-commit detected: stock=${st!.stock}`);
      await assertInvariants("duplicate-commit");
      ok("duplicate commit (webhook retry) is idempotent");
    } catch (e) { fail("duplicate commit (webhook retry) is idempotent", e); }

    // 8. Duplicate release is idempotent
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 1, orderId, orderItemId: "RL", operationId: "OP-RES-RL" });
      await InventoryService.release({ productId: pid, sku: SKU, quantity: 1, orderId, operationId: "OP-REL-RL" });
      const second: any = await InventoryService.release({ productId: pid, sku: SKU, quantity: 1, orderId, operationId: "OP-REL-RL" });
      if (!second.duplicate) throw new Error("second release should be duplicate");
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.reservedStock !== 0) throw new Error(`reserved went negative: ${st!.reservedStock}`);
      await assertInvariants("duplicate-release");
      ok("duplicate release is idempotent");
    } catch (e) { fail("duplicate release is idempotent", e); }

    // 9. Negative-stock adjust rejected
    try {
      await resetState(productId, SKU, 2);
      let threw = false;
      try {
        await InventoryService.adjust({ productId: pid, sku: SKU, delta: -5, reason: "test negative guard" });
      } catch (err: any) {
        if (err?.code === "NEGATIVE_STOCK") threw = true;
      }
      if (!threw) throw new Error("expected NEGATIVE_STOCK");
      ok("negative adjust rejected");
    } catch (e) { fail("negative adjust rejected", e); }

    // 10. Expired reservations auto-release
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 2, orderId, orderItemId: "E", operationId: "OP-RES-EXP" });
      await InventoryReservation.updateOne({ orderId: new mongoose.Types.ObjectId(orderId) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const out = await InventoryService.releaseExpired(10);
      if (out.released < 1) throw new Error("expected >=1 released");
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.reservedStock !== 0) throw new Error(`expected reserved=0 after expiry, got ${st!.reservedStock}`);
      await assertInvariants("expiry");
      ok("expired reservations auto-release");
    } catch (e) { fail("expired reservations auto-release", e); }

    // 11. Concurrent commits for same reservation — never over-deduct
    try {
      await resetState(productId, SKU, 5);
      const orderId = newOid();
      await InventoryService.reserve({ productId: pid, sku: SKU, quantity: 1, orderId, orderItemId: "CC", operationId: "OP-RES-CC" });
      const results = await Promise.allSettled([
        InventoryService.commit({ productId: pid, sku: SKU, quantity: 1, orderId, operationId: "OP-CC-A" }),
        InventoryService.commit({ productId: pid, sku: SKU, quantity: 1, orderId, operationId: "OP-CC-B" }),
      ]);
      const st: any = await InventoryState.findOne({ productId, sku: SKU }).lean();
      if (st!.stock < 4 || st!.reservedStock < 0) throw new Error(`over-commit: ${st!.stock}/${st!.reservedStock}`);
      void results;
      await assertInvariants("concurrent-commit");
      ok("concurrent commits never over-deduct");
    } catch (e) { fail("concurrent commits never over-deduct", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All inventory tests passed!");
}

main().catch((e) => {
  console.error("Fatal test error", e);
  process.exit(1);
});
