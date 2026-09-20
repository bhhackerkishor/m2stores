/* eslint-disable no-console */
import { checkRateLimit, __resetRateLimits, LIMITS } from "../lib/rate-limit";
import { hasPermission } from "../config/permissions";
import { loginSchema } from "../validators/auth";
import { createReviewSchema } from "../validators/engagement";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? e.message : e); };

async function main() {
  console.log("🧪 Starting security tests...");

  // 1. Rate limiter bursts then blocks with headers data
  try {
    __resetRateLimits();
    let allowed = 0;
    let blocked = 0;
    let last: any = null;
    for (let i = 0; i < LIMITS.auth.limit + 3; i++) {
      const r = checkRateLimit("test-auth", "1.2.3.4", LIMITS.auth.limit, LIMITS.auth.windowMs);
      last = r;
      if (r.allowed) allowed++;
      else blocked++;
    }
    if (allowed !== LIMITS.auth.limit) throw new Error(`expected ${LIMITS.auth.limit} allowed, got ${allowed}`);
    if (blocked !== 3) throw new Error(`expected 3 blocked, got ${blocked}`);
    if (last.remaining !== 0 || last.resetMs <= 0) throw new Error("missing Retry-After metadata");
    ok("rate limiter bursts then blocks with retry metadata");
  } catch (e) { fail("rate limiter bursts then blocks with retry metadata", e); }

  // 2. OTP send throttle: 3 per 10 min per identifier
  try {
    __resetRateLimits();
    let allowed = 0;
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("otp-send-id", "9999999999", LIMITS.otpSend.limit, LIMITS.otpSend.windowMs);
      if (r.allowed) allowed++;
    }
    if (allowed !== 3) throw new Error(`expected 3 OTP sends allowed, got ${allowed}`);
    ok("OTP send throttled (3 per 10 min)");
  } catch (e) { fail("OTP send throttled (3 per 10 min)", e); }

  // 3. NoSQL injection payload rejected by Zod (object instead of string identifier)
  try {
    const evil: any = { identifier: { $gt: "" }, password: "x" };
    const parsed = loginSchema.safeParse(evil);
    if (parsed.success) throw new Error("injection object passed validation");
    // Array/order payloads also rejected
    const evil2: any = { identifier: ["admin"], password: "x" };
    if (loginSchema.safeParse(evil2).success) throw new Error("array identifier passed");
    ok("NoSQL injection shapes rejected by input validation");
  } catch (e) { fail("NoSQL injection shapes rejected by input validation", e); }

  // 4. Oversized / out-of-range payloads rejected (abuse + XSS payload size caps)
  try {
    const big = "A".repeat(6000);
    if (createReviewSchema.safeParse({ productId: "x", rating: 5, title: "t".repeat(10), review: big }).success) {
      throw new Error("oversized review passed");
    }
    if (createReviewSchema.safeParse({ productId: "x", rating: 6, title: "0123456789", review: "0123456789ab" }).success) {
      throw new Error("rating 6 passed");
    }
    // XSS payload is stored as inert text (React escapes on render); validators must still accept legit text with brackets
    const xss = createReviewSchema.safeParse({ productId: "x", rating: 5, title: "Nice <b>bold</b>", review: "Works <img src=x> well, thanks!" });
    if (!xss.success) throw new Error("legit text with brackets wrongly rejected");
    ok("payload bounds enforced; markup stored inert (React-escaped on render)");
  } catch (e) { fail("payload bounds enforced; markup stored inert (React-escaped on render)", e); }

  // 5. RBAC: customer cannot wield admin permissions
  try {
    if (hasPermission("CUSTOMER", "products.write" as any)) throw new Error("customer has products.write");
    if (hasPermission("CUSTOMER", "refunds.trigger" as any)) throw new Error("customer has refunds.trigger");
    if (!hasPermission("SUPER_ADMIN", "products.write" as any)) throw new Error("super admin missing permission");
    if (!hasPermission("ADMIN", "orders.status.update" as any)) throw new Error("admin missing order permission");
    ok("RBAC denies customers, grants admins (server-enforced)");
  } catch (e) { fail("RBAC denies customers, grants admins (server-enforced)", e); }

  // 6. Security headers configured (defense in depth: middleware + next.config)
  try {
    const fs = await import("fs");
    const path = await import("path");
    const middleware = fs.readFileSync(path.join(process.cwd(), "src", "middleware.ts"), "utf8");
    const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    for (const h of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]) {
      if (!middleware.includes(h) || !nextConfig.includes(h)) throw new Error(`missing header ${h}`);
    }
    if (!nextConfig.includes("poweredByHeader") || !nextConfig.includes("false")) {
      throw new Error("poweredByHeader not disabled");
    }
    ok("security headers set in middleware + next.config");
  } catch (e) { fail("security headers set in middleware + next.config", e); }

  // 7. Secrets never logged: logger redacts sensitive fields
  try {
    const { logger } = await import("../lib/logger");
    const orig = console.log;
    let out = "";
    (console as any).log = (s: string) => { out += s; };
    try {
      logger.info("test", "auth", { password: "secret123", otp: "123456", token: "abc", cardNumber: "4111", email: "a@b.c" });
    } finally {
      (console as any).log = orig;
    }
    if (out.includes("secret123") || out.includes("123456") || out.includes("4111")) {
      throw new Error("sensitive value leaked to logs");
    }
    if (!out.includes("[REDACTED]") || !out.includes("a@b.c")) throw new Error("redaction/format wrong");
    ok("logger redacts passwords/OTPs/tokens/cards");
  } catch (e) { fail("logger redacts passwords/OTPs/tokens/cards", e); }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All security tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
