"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function SearchAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ slug: string; name: string; brandId?: { name: string } | string; brand?: string; images: { url: string }[]; salePrice?: number; basePrice: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=6`);
        const data = await res.json();
        if (data.success && data.data) {
          setResults(data.data);
          setShowResults(true);
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Escape") {
      setShowResults(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) {
        window.location.href = `/product/${item.slug}`;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products, brands, categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-10 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          aria-label="Search products"
          aria-expanded={showResults}
          aria-autocomplete="list"
          role="combobox"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setShowResults(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isLoading && !query && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {results.map((result, index) => (
            <Link
              key={result.slug}
              href={`/product/${result.slug}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors border-b border-surface-100 dark:border-surface-700 last:border-0 ${
                index === selectedIndex
                  ? "bg-brand-50 dark:bg-brand-950/30"
                  : "hover:bg-surface-50 dark:hover:bg-surface-700/50"
              }`}
              onMouseDown={() => setShowResults(false)}
            >
              <Image
                src={result.images?.[0]?.url || "https://via.placeholder.com/60x60"}
                alt={result.name}
                width={48}
                height={48}
                className="w-10 h-10 rounded-lg object-cover bg-surface-100"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{result.name}</p>
                {(result.brand || (typeof result.brandId === "object" && result.brandId?.name)) && (
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {typeof result.brandId === "object" ? result.brandId?.name : result.brand}
                  </p>
                )}
              </div>
              {result.salePrice && result.salePrice < result.basePrice && (
                <span className="text-xs font-semibold text-accent-600 dark:text-accent-400 shrink-0">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(result.salePrice)}
                </span>
              )}
            </Link>
          ))}
          {query.length >= 2 && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="block px-4 py-3 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-surface-50 dark:hover:bg-surface-700/50 text-center"
              onMouseDown={() => setShowResults(false)}
            >
              View all results for &ldquo;{query}&rdquo;
            </Link>
          )}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-xl p-6 text-center z-50">
          <p className="text-sm text-surface-500 dark:text-surface-400">No products found for &ldquo;{query}&rdquo;</p>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1 inline-block hover:underline"
            onMouseDown={() => setShowResults(false)}
          >
            Try a broader search
          </Link>
        </div>
      )}
    </div>
  );
}
