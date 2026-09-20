"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function SearchTracker({ query, total }: { query: string; total: number }) {
  useEffect(() => {
    trackEvent("search", { query, total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  return null;
}
