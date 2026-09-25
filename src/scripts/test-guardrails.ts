/* eslint-disable no-console */
/**
 * Guardrail regression tests (Zod binding / injection / IDOR / error footprints).
 *
 * Verifies:
 *   1. NoSQL injection shapes are rejected at the schema boundary
 *   2. Category PUT cannot mass-assign fields (raw body is never spread)
 *   3. support.customerClose chains ownership in the filter (BOLA guard)
 *
 * Usage: npx tsx src/scripts/test-guardrails.ts
 */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { categorySchema, categoryUpdateSchema, inventoryCheckSchema, inventoryCheckQuerySchema } from "../validators/catalog";
import {
  forgotPasswordRequestSchema as forgotSchema,
  resetPasswordOtpSchema as resetSchema,
  verifyOtpRequestSchema as verifyOtpRouteSchema,
  notificationPatchSchema,
  moveWishlistToCartSchema as moveWishlistSchema,
  adminRefundSchema as refundSchema,
  updateEtaSchema,
  updateLocationSchema,
  contactFormSchema as contactSchema,
} from "../validators/route-guards";
import { SupportService } from "../services/support.service";
import { SupportTicket } from "../models/SupportTicket";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };
const expect = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };

const INJECTION_SHAPES: unknown[] = [
  { $gt: "" },
  { $ne: null },
  { $regex: ".*" },
  { $where: "sleep(1000)" },
  ["$where"],
  // Plain strings with SQL/JS metacharacters are NOT injection vectors in
  // Mongo (values are never operators) — they must pass string schemas.
];

async function main() {
  console.log("🧪 Starting guardrail tests...");

  // ---------- 1. Schema boundary rejects non-scalar / operator payloads ----------
  try {
    for (const evil of INJECTION_SHAPES) {
      expect(!forgotSchema.safeParse({ identifier: evil }).success, "forgot-password accepted operator identifier");
      expect(!resetSchema.safeParse({ identifier: evil, otp: evil, newPassword: evil }).success, "reset-password accepted operator payload");
      expect(!verifyOtpRouteSchema.safeParse({ identifier: evil, otp: evil }).success, "verify-otp accepted operator payload");
      expect(!notificationPatchSchema.safeParse({ id: evil }).success, "notifications accepted operator id");
      expect(!moveWishlistSchema.safeParse({ sku: evil, quantity: evil }).success, "move-to-cart accepted operator payload");
      expect(!contactSchema.safeParse({ name: evil, email: "a@b.co", message: "hello there!!" }).success, "contact accepted operator name");
      expect(!updateEtaSchema.safeParse({ estimatedDelivery: "2030-01-01", reason: evil }).success, "update-eta accepted operator reason");
      expect(!updateLocationSchema.safeParse({ location: evil }).success, "update-location accepted operator location");
      expect(!refundSchema.safeParse({ amount: evil, reason: "legit reason" }).success, "refund accepted operator amount");
      expect(!categorySchema.safeParse({ name: evil, slug: "slug-ok" }).success, "category accepted operator name");
      expect(!categoryUpdateSchema.safeParse({ name: evil }).success, "category update accepted operator name");
      expect(!inventoryCheckSchema.safeParse({ productId: evil, sku: evil, quantity: evil }).success, "inventory check accepted operator payload");
      expect(!inventoryCheckQuerySchema.safeParse({ sku: evil }).success, "inventory query accepted operator sku");
    }
    expect(!inventoryCheckSchema.safeParse({ productId: "507f1f77bcf86cd799439011", sku: "A-1", quantity: 1.5 }).success, "fractional quantity accepted");
    expect(!inventoryCheckSchema.safeParse({ productId: "507f1f77bcf86cd799439011", sku: "A-1", quantity: -5 }).success, "negative quantity accepted");
    expect(!refundSchema.safeParse({ amount: -1, reason: "legit reason" }).success, "negative refund amount accepted");
    expect(!refundSchema.safeParse({ amount: 100 }).success, "refund without reason accepted");
    expect(!categoryUpdateSchema.safeParse({ parentCategoryId: "not-an-id" }).success, "bad parent id accepted");
    expect(!categoryUpdateSchema.safeParse({ sortOrder: "12" }).success, "string sortOrder accepted");
    // Plain string payloads stay valid (they are values, never query operators)
    expect(forgotSchema.safeParse({ identifier: "user@example.com" }).success, "valid identifier rejected");
    expect(refundSchema.safeParse({ amount: 100, reason: "legit reason" }).success, "valid refund rejected");
    ok("operator payloads rejected at every hardened schema boundary (plain strings still valid)");
  } catch (e) { fail("operator payloads rejected at every hardened schema boundary (plain strings still valid)", e); }

  // ---------- 2. Mass-assignment: unknown keys stripped by category PUT schema ----------
  try {
    const raw = {
      name: "Safe Name",
      slug: "safe-slug",
      isActive: false,
      level: 99,
      isSuperAdmin: true,
      __proto__: { polluted: true },
      createdAt: new Date(),
      $set: { level: 99 },
    };
    const parsed = categoryUpdateSchema.safeParse(raw);
    expect(parsed.success, "valid category update rejected");
    const data: any = parsed.success ? parsed.data : {};
    expect(data.name === "Safe Name" && data.isActive === false, "legit fields dropped");
    expect(data.level === undefined, "level was mass-assigned through PUT");
    expect(data.isSuperAdmin === undefined, "unknown key leaked into update");
    expect(data.createdAt === undefined, "createdAt leaked into update");
    expect(Object.keys(data.$set ?? {}).length === undefined || data.$set === undefined, "$set operator leaked into update");
    expect(({} as any).polluted === undefined, "prototype was polluted");
    ok("category PUT strips unknown keys (no mass assignment / no $set injection)");
  } catch (e) { fail("category PUT strips unknown keys (no mass assignment / no $set injection)", e); }

  // ---------- 3. BOLA: customerClose chains owner in the filter ----------
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());
  try {
    const { User } = await import("../models/User");
    const owner: any = await User.create({ name: "Owner", phone: "9876543210", role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const attacker: any = await User.create({ name: "Attacker", phone: "9876543211", role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const ticket: any = await SupportTicket.create({
      ticketNumber: `T-${Date.now()}`,
      user: owner._id,
      subject: "My order is late",
      category: "SHIPPING_ISSUE",
      priority: "MEDIUM",
      status: "WAITING_FOR_CUSTOMER",
      messages: [],
    });

    let denied = "";
    try {
      await SupportService.customerClose(String(ticket._id), String(attacker._id));
    } catch (e: any) { denied = e?.code || ""; }
    expect(denied === "NOT_FOUND", `cross-user close should 404, got "${denied}"`);
    ok("support close denies another user's ticket (ownership in filter)");

    await SupportService.customerClose(String(ticket._id), String(owner._id));
    const after: any = await SupportTicket.findById(ticket._id).lean();
    expect(after?.status === "CLOSED", "owner could not close own ticket");
    ok("support close allows the owner");
  } catch (e) { fail("support close ownership guard", e); }
  finally {
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
