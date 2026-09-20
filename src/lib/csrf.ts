import crypto from "crypto";

const CSRF_SECRET = process.env.JWT_SECRET || "csrf-fallback";
const CSRF_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a signed CSRF token. Embed in forms/meta tags.
 * Token = base64(payload) + "." + hmac
 */
export function generateCsrfToken(sessionId?: string): string {
  const payload = {
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
    sid: sessionId || "",
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", CSRF_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/**
 * Validate a CSRF token. Returns true if valid and not expired.
 */
export function validateCsrfToken(token: string, maxAgeMs = CSRF_MAX_AGE_MS): boolean {
  if (!token || !token.includes(".")) return false;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", CSRF_SECRET).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return Date.now() - payload.ts < maxAgeMs;
  } catch {
    return false;
  }
}

/**
 * Middleware helper: extract and validate CSRF from header.
 * For SameSite=Lax cookies + JSON body, CSRF is mitigated by:
 *   1. SameSite=Lax blocks cross-site POST
 *   2. Content-Type: application/json can't be sent via simple forms
 * This is a defense-in-depth layer for extra safety.
 */
export function requireCsrf(request: Request): boolean {
  // Skip for GET/HEAD/OPTIONS (safe methods)
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  // Check X-CSRF-Token header (set by client from meta tag)
  const token = request.headers.get("x-csrf-token") || "";
  return validateCsrfToken(token);
}
