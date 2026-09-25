/* eslint-disable no-console */
/**
 * One-time (idempotent) migration for the delivery + COD pincode rules.
 *
 * Before: COD gate was an allowlist of ~5 metro pincodes; no delivery gate.
 * After:  delivery + COD each run a pincode mode. Default here matches the
 *          business rule "most Tamil Nadu pincodes deliverable + COD-able,
 *          other states restricted" — delivery allowlist = TN 600..641
 *          prefixes, COD allowlist = same, and the stale 5-city COD list is
 *          cleared (those cities are outside TN and were the old default).
 *
 * Only fills fields that are missing — existing admin values are preserved.
 * Use --force to re-apply defaults over current values.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-delivery-settings.ts
 *   npx tsx src/scripts/migrate-delivery-settings.ts --force
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Setting } from "../models/Setting";

const TN_PREFIXES = Array.from({ length: 42 }, (_, i) => String(600 + i)); // 600..641
const LEGACY_COD_CITIES = ["110001", "400001", "560001", "700001", "500001"];

async function main() {
  const force = process.argv.includes("--force");
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected. Migrating delivery/COD pincode settings...");

  // Read the RAW stored doc — hydrated Setting applies schema defaults, which
  // would mask "field never set" (e.g. deliveryPincodeMode defaults to "all").
  const raw: any = await Setting.collection.findOne({});
  if (!raw) {
    console.log("No Setting document yet — nothing to migrate (defaults insert on first save).");
    await mongoose.disconnect();
    return;
  }

  const s: any = await Setting.findOne();
  const before = JSON.stringify({
    deliveryPincodeMode: raw.deliveryPincodeMode,
    deliveryAllowedPrefixes: raw.deliveryAllowedPrefixes,
    codPincodeMode: raw.codPincodeMode,
    codAllowedPrefixes: raw.codAllowedPrefixes,
    codAllowedPincodes: raw.codAllowedPincodes,
  });

  const changes: string[] = [];
  const set: Record<string, unknown> = {};

  // Delivery: TN allowlist by default when the feature was never configured
  const deliveryUnconfigured = raw.deliveryPincodeMode === undefined && !(raw.deliveryAllowedPrefixes || []).length && !(raw.deliveryBlockedPincodes || []).length;
  if (deliveryUnconfigured || force) {
    set.deliveryPincodeMode = "allowlist";
    changes.push("deliveryPincodeMode=allowlist");
  }
  if (force || !(raw.deliveryAllowedPrefixes || []).length) {
    set.deliveryAllowedPrefixes = TN_PREFIXES;
    changes.push(`deliveryAllowedPrefixes=${TN_PREFIXES.length} TN ranges`);
  }

  // COD: same TN allowlist; clear legacy 5-city list
  const codUnconfigured = raw.codPincodeMode === undefined;
  if (codUnconfigured || force) {
    set.codPincodeMode = "allowlist";
    changes.push("codPincodeMode=allowlist");
  }
  if (force || !(raw.codAllowedPrefixes || []).length) {
    set.codAllowedPrefixes = TN_PREFIXES;
    changes.push(`codAllowedPrefixes=${TN_PREFIXES.length} TN ranges`);
  }
  const currentCodList: string[] = raw.codAllowedPincodes || [];
  const kept = currentCodList.filter((p) => !LEGACY_COD_CITIES.includes(p));
  if (force || kept.length !== currentCodList.length) {
    set.codAllowedPincodes = kept;
    changes.push(`codAllowedPincodes: ${currentCodList.length} -> ${kept.length} (legacy metro list cleared)`);
  }

  if (changes.length === 0) {
    console.log("Already migrated — no changes.");
    await mongoose.disconnect();
    return;
  }

  s.set(set);
  await s.save();
  console.log("Applied:", changes.join("; "));
  console.log("Before:", before);
  console.log(
    "After:",
    JSON.stringify({
      deliveryPincodeMode: s.deliveryPincodeMode,
      deliveryAllowedPrefixes: `${(s.deliveryAllowedPrefixes || []).length} prefixes`,
      codPincodeMode: s.codPincodeMode,
      codAllowedPrefixes: `${(s.codAllowedPrefixes || []).length} prefixes`,
      codAllowedPincodes: s.codAllowedPincodes,
    })
  );
  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
