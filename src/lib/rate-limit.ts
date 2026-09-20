/**
 * Edge-safe sliding-window rate limiter (per-instance memory).
 * For multi-instance production, swap the store with Redis (same interface).
 */
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

export function checkRateLimit(namespace: string, key: string, limit: number, windowMs: number, now = Date.now()): RateLimit {
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
}
