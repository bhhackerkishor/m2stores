"use client";

import { useEffect } from "react";
import { recordProductView } from "@/hooks/useRecentlyViewed";
import { trackEvent } from "@/lib/analytics";

export function ProductViewTracker({ slug, productId, name, price }: { slug: string; productId: string; name: string; price: number }) {
  useEffect(() => {
    recordProductView(slug);
    trackEvent("product_view", { slug, productId, name, price });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  return null;
}
