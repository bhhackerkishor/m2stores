/* eslint-disable no-console */
// Diagnostic: inspect carts/wishlists indexes + null-field docs. Read-only.
import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db!;

  for (const name of ["carts", "wishlists", "payments", "orders", "returnrequests"]) {
    const col = db.collection(name);
    const indexes = await col.indexes();
    console.log(`\n=== ${name} indexes ===`);
    for (const ix of indexes) {
      console.log(" ", JSON.stringify({ name: ix.name, key: ix.key, unique: ix.unique, sparse: ix.sparse, partial: ix.partialFilterExpression }));
    }
    const total = await col.countDocuments();
    console.log(`  total docs: ${total}`);
    if (name === "carts" || name === "wishlists") {
      const nullGuest = await col.countDocuments({ guestSessionId: null });
      const hasGuest = await col.countDocuments({ guestSessionId: { $type: "string" } });
      const nullUser = await col.countDocuments({ userId: null });
      const hasUser = await col.countDocuments({ userId: { $type: "objectId" } });
      console.log(`  guestSessionId: string=${hasGuest} explicitNull=${nullGuest} missing=${total - hasGuest - nullGuest}`);
      console.log(`  userId: objectId=${hasUser} explicitNull=${nullUser} missing=${total - hasUser - nullUser}`);
      const dupGuest = await col
        .aggregate([{ $group: { _id: "$guestSessionId", n: { $sum: 1 }, ids: { $push: "$_id" } } }, { $match: { n: { $gt: 1 } } }])
        .toArray();
      const dupUser = await col
        .aggregate([{ $group: { _id: "$userId", n: { $sum: 1 }, ids: { $push: "$_id" } } }, { $match: { n: { $gt: 1 } } }])
        .toArray();
      console.log(`  dup guestSessionId groups: ${JSON.stringify(dupGuest).slice(0, 500)}`);
      console.log(`  dup userId groups: ${JSON.stringify(dupUser).slice(0, 500)}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
