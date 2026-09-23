/* eslint-disable no-console */
/**
 * Backfill InventoryState for products that have no stock rows (created via
 * admin UI before inventory auto-sync existed). Idempotent — only creates
 * missing rows with stock 0 (or --stock=N); never touches existing rows.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-product-inventory.ts
 *   npx tsx src/scripts/backfill-product-inventory.ts --stock=10
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../models/Product";
import { InventoryState } from "../models/Inventory";

async function main() {
  const stockArg = process.argv.find((a) => a.startsWith("--stock="));
  const defaultStock = stockArg ? Math.max(0, parseInt(stockArg.split("=")[1] || "0", 10) || 0) : 0;

  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected. Backfill missing inventory with stock=${defaultStock}...`);

  const products = await Product.find({ status: { $ne: "ARCHIVED" } }).lean();
  let created = 0;
  let alreadyOk = 0;

  for (const p of products as any[]) {
    const useVariants = p.hasVariants && (p.variants?.length || 0) > 0;
    const targets: Array<{ sku: string }> = [];
    if (useVariants) {
      for (const v of p.variants) {
        const sku = String(v.sku || "").trim().toUpperCase();
        if (sku) targets.push({ sku });
      }
    } else {
      let sku = String(p.baseSKU || "").trim().toUpperCase();
      if (!sku) {
        sku = `SKU-${String(p._id).slice(0, 8).toUpperCase()}`;
        await Product.updateOne({ _id: p._id }, { $set: { baseSKU: sku } });
        console.log(`  generated baseSKU ${sku} for ${p.name}`);
      }
      targets.push({ sku });
    }

    for (const t of targets) {
      const existing = await InventoryState.findOne({ productId: p._id, sku: t.sku });
      if (existing) {
        alreadyOk++;
        continue;
      }
      await InventoryState.create({
        productId: p._id,
        sku: t.sku,
        stock: defaultStock,
        reservedStock: 0,
        lowStockThreshold: 5,
      });
      created++;
      console.log(`  + inventory ${t.sku} (stock=${defaultStock}) for ${p.name}`);
    }
  }

  console.log(`\nDone: ${created} rows created, ${alreadyOk} already present, ${products.length} products scanned.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
