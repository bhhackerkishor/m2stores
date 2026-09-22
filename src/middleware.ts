import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitSync, clientIp, LIMITS } from "@/lib/rate-limit";

function securityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  return res;
}

function rateLimitedResponse(limit: { remaining: number; resetMs: number; limit: number }) {
  const res = NextResponse.json(
    { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down and retry." } },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(Math.max(1, Math.ceil(limit.resetMs / 1000))));
  res.headers.set("X-RateLimit-Limit", String(limit.limit));
  res.headers.set("X-RateLimit-Remaining", String(limit.remaining));
  return securityHeaders(res);
}

/**
 * Cryptographically verify JWT signature using Edge-compatible Web Crypto API.
 * This prevents forged JWTs with arbitrary role claims from accessing admin routes.
 */
async function verifyJwtPayload(token: string): Promise<{ role?: string } | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, data);
    if (!valid) return null;

    return JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Abuse protection for hot API routes (Edge-safe, per-instance) ---
  if (pathname.startsWith("/api/")) {
    const ip = clientIp(request);
    if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
      const r = checkRateLimitSync("auth-ip", ip, LIMITS.auth.limit, LIMITS.auth.windowMs);
      if (!r.allowed) return rateLimitedResponse(r);
    } else if (pathname.startsWith("/api/auth/send-otp") || pathname.startsWith("/api/auth/verify-otp") || pathname.startsWith("/api/auth/forgot-password")) {
      const r = checkRateLimitSync("otp-ip", ip, LIMITS.otpVerify.limit, LIMITS.otpVerify.windowMs);
      if (!r.allowed) return rateLimitedResponse(r);
    } else if (pathname.startsWith("/api/checkout/")) {
      const r = checkRateLimitSync("checkout-ip", ip, LIMITS.checkout.limit, LIMITS.checkout.windowMs);
      if (!r.allowed) return rateLimitedResponse(r);
    } else if (pathname.startsWith("/api/payments/")) {
      // Webhooks must never be throttled into drops from the provider retrying —
      // use a generous bucket so only abusive floods trip.
      if (!pathname.includes("/webhook")) {
        const r = checkRateLimitSync("payments-ip", ip, LIMITS.payments.limit, LIMITS.payments.windowMs);
        if (!r.allowed) return rateLimitedResponse(r);
      }
    } else {
      const r = checkRateLimitSync("api-ip", `${ip}:${pathname.split("/").slice(0, 4).join("/")}`, LIMITS.api.limit, LIMITS.api.windowMs);
      if (!r.allowed) return rateLimitedResponse(r);
    }
  }

  // Allow public paths
  const publicPaths = ["/login", "/register", "/verify-otp", "/forgot-password", "/api/auth/", "/api/health", "/api/csrf"];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return securityHeaders(NextResponse.next());
  }

  // Get token from cookie
  const token = request.cookies.get("m2s_token")?.value;

  // Check if authenticated
  const isAuthenticated = !!token;

  // Auth-required routes
  const protectedPaths = ["/profile", "/cart", "/checkout", "/orders", "/wishlist", "/coupons", "/support"];
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return securityHeaders(NextResponse.redirect(url));
    }
  }

  // Admin-required routes — cryptographically verify JWT signature
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return securityHeaders(NextResponse.redirect(url));
    }
    const payload = await verifyJwtPayload(token!);
    if (!payload || (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN")) {
      return securityHeaders(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
