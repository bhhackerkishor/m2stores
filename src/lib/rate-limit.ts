/**
 * Edge-safe sliding-window rate limiter.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured (shared across
 * all Vercel serverless instances), otherwise falls back to per-instance memory.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface Bucket {
  hits: number[];
}

const stores = new Map<string, Map<string, Bucket>>();

function storeFor(namespace: string): Map<string, Bucket> {
  let s = stores.get(namespace);
  if (!s) {
    s = new Map();
    stores.set(namespace, s);
  }
  return s;
}

export interface RateLimit {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
}

// ── Upstash (production-grade, shared across instances) ──
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(upstashUrl && upstashToken);

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(namespace: string, limit: number, windowMs: number): Ratelimit {
  const key = `${namespace}:${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    const redis = new Redis({ url: upstashUrl!, token: upstashToken! });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: `m2s:${namespace}`,
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// ── In-memory fallback (per-instance, dev/test) ──
function checkRateLimitMemory(namespace: string, key: string, limit: number, windowMs: number, now = Date.now()): RateLimit {
  const store = storeFor(namespace);
  let bucket = store.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    store.set(key, bucket);
  }
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  // Opportunistic cleanup to bound memory
  if (store.size > 5000 && Math.random() < 0.01) {
    for (const [k, b] of store) {
      if (b.hits.length === 0 || b.hits[b.hits.length - 1] <= cutoff) store.delete(k);
    }
  }
  if (bucket.hits.length >= limit) {
    return { allowed: false, remaining: 0, resetMs: bucket.hits[0] + windowMs - now, limit };
  }
  bucket.hits.push(now);
  return { allowed: true, remaining: limit - bucket.hits.length, resetMs: windowMs, limit };
}

export async function checkRateLimit(namespace: string, key: string, limit: number, windowMs: number): Promise<RateLimit> {
  if (useUpstash) {
    try {
      const limiter = getUpstashLimiter(namespace, limit, windowMs);
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetMs: result.reset ? result.reset - Date.now() : windowMs,
        limit,
      };
    } catch {
      // Upstash unreachable — fall back to in-memory to avoid blocking all traffic
      return checkRateLimitMemory(namespace, key, limit, windowMs);
    }
  }
  return checkRateLimitMemory(namespace, key, limit, windowMs);
}

/** Synchronous version for middleware (uses in-memory only; Upstash is async). */
export function checkRateLimitSync(namespace: string, key: string, limit: number, windowMs: number, now = Date.now()): RateLimit {
  return checkRateLimitMemory(namespace, key, limit, windowMs, now);
}

export function clientIp(request: Request): string {
  const h = (name: string) => request.headers.get(name) || "";
  const forwarded = h("x-forwarded-for").split(",")[0].trim();
  return forwarded || h("x-real-ip") || "unknown";
}

export const LIMITS = {
  /** Login/register: brute-force protection */
  auth: { limit: 10, windowMs: 60_000 },
  authIdentifier: { limit: 5, windowMs: 60_000 },
  /** OTP send: 3 per 10 min per identifier + per IP */
  otpSend: { limit: 3, windowMs: 10 * 60_000 },
  /** OTP verify attempts at HTTP layer (model also caps at 5) */
  otpVerify: { limit: 10, windowMs: 10 * 60_000 },
  /** Checkout/payment/cart write bursts */
  checkout: { limit: 30, windowMs: 60_000 },
  payments: { limit: 30, windowMs: 60_000 },
  /** General API abuse */
  api: { limit: 120, windowMs: 60_000 },
} as const;

// Test-only reset
export function __resetRateLimits() {
  stores.clear();
  upstashLimiters.clear();
}
