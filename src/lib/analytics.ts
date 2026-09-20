"use client";

export type AnalyticsEvent =
  | "product_view"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "wishlist_add"
  | "checkout_started"
  | "payment_started"
  | "payment_success"
  | "order_created"
  | "purchase"
  | "refund";

interface AnalyticsSink {
  track(event: AnalyticsEvent, props?: Record<string, unknown>): void;
}

class ConsoleSink implements AnalyticsSink {
  track(event: AnalyticsEvent, props?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[analytics] ${event}`, props || {});
    }
  }
}

class HttpSink implements AnalyticsSink {
  constructor(private endpoint: string) {}
  track(event: AnalyticsEvent, props?: Record<string, unknown>) {
    try {
      const body = JSON.stringify({ event, props: props || {}, ts: new Date().toISOString() });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator && this.endpoint) {
        navigator.sendBeacon(this.endpoint, body);
      } else if (this.endpoint) {
        fetch(this.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    } catch {
      // never break UX
    }
  }
}

function sinks(): AnalyticsSink[] {
  const list: AnalyticsSink[] = [new ConsoleSink()];
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  if (endpoint) list.push(new HttpSink(endpoint));
  return list;
}

export function trackEvent(event: AnalyticsEvent, props?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      // still track; reduced-motion only affects visuals
    }
    for (const s of sinks()) s.track(event, props);
  } catch {
    // analytics must never throw
  }
}
