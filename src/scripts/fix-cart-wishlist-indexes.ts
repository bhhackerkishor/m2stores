/* eslint-disable no-console */
/**
 * One-off repair for carts/wishlists unique indexes + orphaned null keys.
 *
 * Why: live DB had carts.guestSessionId_1 unique WITHOUT sparse, so user carts
 * (no guestSessionId field) were indexed as null and collided → E11000 on add-to-cart.
 * Also merges duplicate-user wishlists before building the unique userId index.
 *
 * Idempotent — safe to re-run.
 */
import "dotenv/config";
import mongoose from "mongoose";

type Coll = ReturnType<NonNullable<import("mongoose").Connection["db"]>["collection"]>;

async function unsetNullKeys(coll: Coll, fields: string[]) {
  for (const f of fields) {
    const r = await coll.updateMany({ [f]: null }, { $unset: { [f]: "" } });
    if (r.modifiedCount) console.log(`  unset ${f}: null on ${r.modifiedCount} docs`);
  }
}

async function mergeDuplicateOwner(coll: Coll, field: string, mode: "cart" | "wishlist") {
  const dups = await coll
    .aggregate([
      { $match: { [field]: { $type: field === "userId" ? "objectId" : "string" } } },
      { $group: { _id: `$${field}`, ids: { $push: "$_id" }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();

  for (const g of dups) {
    const docs = await coll.find({ _id: { $in: g.ids } }).sort({ updatedAt: -1 }).toArray();
    const keeper = docs[0];
    for (let i = 1; i < docs.length; i++) {
      const other = docs[i];
      const otherItems: any[] = Array.isArray(other.items) ? other.items : [];
      const keeperItems: any[] = Array.isArray(keeper.items) ? keeper.items : [];
      for (const item of otherItems) {
        const idx = keeperItems.findIndex((k) => k.sku === item.sku);
        if (idx >= 0) {
          if (mode === "cart") keeperItems[idx].quantity = Math.min(10, (keeperItems[idx].quantity || 0) + (item.quantity || 1));
        } else {
          keeperItems.push(item);
        }
      }
      keeper.items = keeperItems;
      if (mode === "cart" && !keeper.appliedCouponCode && other.appliedCouponCode) {
        keeper.appliedCouponCode = other.appliedCouponCode;
      }
      await coll.deleteOne({ _id: other._id });
      console.log(`  merged duplicate ${field}=${String(g._id)}: removed ${other._id}`);
    }
    await coll.updateOne({ _id: keeper._id }, { $set: { items: keeper.items, ...(keeper.appliedCouponCode !== undefined ? { appliedCouponCode: keeper.appliedCouponCode } : {}) } });
  }
  return dups.length;
}

async function rebuildIndexes(coll: Coll, specs: Array<{ key: Record<string, 1 | -1>; name: string; partialFilterExpression: Record<string, unknown> }>) {
  // Drop every non-_id index, then rebuild the intended set.
  const existing = await coll.indexes();
  for (const ix of existing) {
    if (!ix.name || ix.name === "_id_") continue;
    try {
      await coll.dropIndex(ix.name);
      console.log(`  dropped index ${ix.name}`);
    } catch (e: any) {
      if (e?.codeName !== "IndexNotFound") console.warn(`  drop ${ix.name} failed:`, e.message);
    }
  }
  for (const s of specs) {
    await coll.createIndex(s.key, { unique: true, name: s.name, partialFilterExpression: s.partialFilterExpression });
    console.log(`  created index ${s.name} (unique + partial)`);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db!;

  for (const [name, mode] of [
    ["carts", "cart"],
    ["wishlists", "wishlist"],
  ] as const) {
    console.log(`\n=== repairing ${name} ===`);
    const coll = db.collection(name);
    await unsetNullKeys(coll, ["userId", "guestSessionId"]);
    await mergeDuplicateOwner(coll, "userId", mode);
    await mergeDuplicateOwner(coll, "guestSessionId", mode);
    // Final safety: any lingering null/missing after merges
    await unsetNullKeys(coll, ["userId", "guestSessionId"]);
    await rebuildIndexes(coll, [
      { key: { userId: 1 }, name: "userId_1", partialFilterExpression: { userId: { $type: "objectId" } } },
      { key: { guestSessionId: 1 }, name: "guestSessionId_1", partialFilterExpression: { guestSessionId: { $type: "string" } } },
    ]);
    const total = await coll.countDocuments();
    const withUser = await coll.countDocuments({ userId: { $type: "objectId" } });
    const withGuest = await coll.countDocuments({ guestSessionId: { $type: "string" } });
    const orphans = total - withUser - withGuest;
    console.log(`  result: total=${total} byUser=${withUser} byGuest=${withGuest} orphan(no key)=${orphans}`);
    if (orphans > 0) console.warn(`  ⚠ ${orphans} docs have neither userId nor guestSessionId (unreachable)`);
  }

  await mongoose.disconnect();
  console.log("\n✅ repair complete");
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
