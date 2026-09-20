"use client";

import { useEffect, useState } from "react";

const KEY = "m2s_recently_viewed";
const MAX = 12;

export function recordProductView(slug: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const next = [slug, ...arr.filter((s) => s !== slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode — ignore
  }
}

export function useRecentlyViewed(excludeSlug?: string) {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      setSlugs(arr.filter((s) => s !== excludeSlug).slice(0, 8));
    } catch {
      setSlugs([]);
    }
  }, [excludeSlug]);
  return slugs;
}
