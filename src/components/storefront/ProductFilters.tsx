"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface FiltersProps {
  brands: Array<{ _id: string; name: string; slug: string }>;
  categories: Array<{ _id: string; name: string; slug: string }>;
  /** Distinct variant-attribute values in the current scope, e.g. { color: [{value, count}] } */
  attributes?: Record<string, Array<{ value: string; count: number }>>;
  showCategory?: boolean;
}

export function ProductFilters({ brands, categories, attributes = {}, showCategory = true }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) params.delete(key);
      else params.set(key, value);
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleAttr = useCallback(
    (attrKey: string, value: string) => {
      const paramKey = `attr_${attrKey}`;
      const current = (searchParams.get(paramKey) || "").split(",").filter(Boolean);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      updateParam(paramKey, next.join(","));
    },
    [searchParams, updateParam]
  );

  const attrKeys = Object.keys(attributes).sort();

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-6 sticky top-20">
      <div>
        <h4 className="font-semibold text-surface-900 mb-3 text-sm uppercase tracking-wide">Sort</h4>
        <select
          value={searchParams.get("sort") || "relevance"}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateParam("sort", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="popularity">Most Popular</option>
        </select>
      </div>

      {showCategory && (
        <div>
          <h4 className="font-semibold text-surface-900 mb-3 text-sm uppercase tracking-wide">Category</h4>
          <div className="space-y-1 max-h-48 overflow-auto">
            <button
              onClick={() => updateParam("category", "")}
              className={`block w-full text-left px-2 py-1.5 rounded text-sm ${!searchParams.get("category") ? "bg-blue-50 text-blue-700 font-medium" : "text-surface-600 hover:bg-surface-50"}`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => updateParam("category", c._id)}
                className={`block w-full text-left px-2 py-1.5 rounded text-sm ${searchParams.get("category") === c._id ? "bg-blue-50 text-blue-700 font-medium" : "text-surface-600 hover:bg-surface-50"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold text-surface-900 mb-3 text-sm uppercase tracking-wide">Brand</h4>
        <div className="space-y-1 max-h-48 overflow-auto">
          <button
            onClick={() => updateParam("brand", "")}
            className={`block w-full text-left px-2 py-1.5 rounded text-sm ${!searchParams.get("brand") ? "bg-blue-50 text-blue-700 font-medium" : "text-surface-600 hover:bg-surface-50"}`}
          >
            All Brands
          </button>
          {brands.map((b) => (
            <button
              key={b._id}
              onClick={() => updateParam("brand", b._id)}
              className={`block w-full text-left px-2 py-1.5 rounded text-sm ${searchParams.get("brand") === b._id ? "bg-blue-50 text-blue-700 font-medium" : "text-surface-600 hover:bg-surface-50"}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-surface-900 mb-3 text-sm uppercase tracking-wide">Price</h4>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={searchParams.get("minPrice") || ""}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateParam("minPrice", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={searchParams.get("maxPrice") || ""}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateParam("maxPrice", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm"
          />
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-surface-900 mb-3 text-sm uppercase tracking-wide">Rating</h4>
        <div className="space-y-1">
          {[
            { v: "", label: "All ratings" },
            { v: "4", label: "4★ & above" },
            { v: "3", label: "3★ & above" },
          ].map((o) => (
            <button
              key={o.v || "all"}
              onClick={() => updateParam("minRating", o.v)}
              className={`block w-full text-left px-2 py-1.5 rounded text-sm ${(searchParams.get("minRating") || "") === o.v ? "bg-blue-50 text-blue-700 font-medium" : "text-surface-600 hover:bg-surface-50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
          <input
            type="checkbox"
            checked={searchParams.get("inStock") === "true"}
            onChange={(e) => updateParam("inStock", e.target.checked ? "true" : "")}
            className="rounded"
          />
          In stock only
        </label>
      </div>

      {attrKeys.length > 0 && (
        <div>
          <h4 className="font-semibold text-surface-900 mb-3 text-sm uppercase tracking-wide">Attributes</h4>
          {attrKeys.map((key) => {
            const selected = (searchParams.get(`attr_${key}`) || "").split(",").filter(Boolean);
            return (
              <div key={key} className="mb-3">
                <p className="text-xs font-semibold text-surface-500 uppercase mb-1.5">{key}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(attributes[key] || []).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleAttr(key, opt.value)}
                      className={`px-2.5 py-1 rounded-lg border text-xs ${selected.includes(opt.value) ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold" : "border-surface-200 text-surface-600 hover:border-surface-400"}`}
                    >
                      {opt.value} ({opt.count})
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => router.push("?", { scroll: false })}
        className="w-full text-sm text-surface-500 hover:text-surface-900 underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
