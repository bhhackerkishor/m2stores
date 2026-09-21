import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductFilters } from "@/components/storefront/ProductFilters";
import { CatalogService, ProductFilters as F } from "@/services/catalog.service";
import { getPublicSettings } from "@/lib/public-settings";
import { SearchIcon } from "lucide-react";

interface ShopSearchParams {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  inStock?: string;
  page?: string;
  [key: string]: string | undefined;
}

export const metadata: Metadata = {
  title: "Shop All Products | M2Stores",
  description: "Browse all products across electronics, fashion, home, beauty and more.",
  alternates: { canonical: "/shop" },
};

function parseAttrs(sp: ShopSearchParams): Record<string, string[]> | undefined {
  const attrs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k.startsWith("attr_") && v) {
      const vals = v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);
      if (vals.length) attrs[k.slice(5)] = vals;
    }
  }
  return Object.keys(attrs).length ? attrs : undefined;
}

function pageParams(sp: ShopSearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, v);
  }
  params.set("page", String(page));
  return params.toString();
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<ShopSearchParams> }) {
  const sp = await searchParams;
  const filters: F = {
    q: sp.q,
    categoryId: sp.category,
    brandId: sp.brand,
    sort: (sp.sort as F["sort"]) || "relevance",
    minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
    minRating: sp.minRating ? parseFloat(sp.minRating) : undefined,
    inStock: sp.inStock === "true" ? true : undefined,
    attrs: parseAttrs(sp),
    page: sp.page ? parseInt(sp.page) : 1,
    limit: 12,
  };

  const [result, brands, categories, facets, pubSettings] = await Promise.all([
    CatalogService.listProducts(filters),
    CatalogService.getBrands(true),
    CatalogService.getCategories(true),
    CatalogService.getFacets(filters).catch(() => ({ attributes: {} as Record<string, Array<{ value: string; count: number }>> })),
    getPublicSettings(),
  ]);

  const totalPages = result.totalPages;
  const windowed = totalPages > 7
    ? [...new Set([1, 2, result.page - 1, result.page, result.page + 1, totalPages - 1, totalPages].filter((p) => p >= 1 && p <= totalPages))].sort((a, b) => a - b)
    : Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
          {sp.q ? <>Results for &ldquo;{sp.q}&rdquo;</> : "All Products"}
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {result.total} products{sp.q ? " found" : ""}{sp.q ? " · prefix-tolerant matching" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <ProductFilters
            brands={JSON.parse(JSON.stringify(brands))}
            categories={JSON.parse(JSON.stringify(categories))}
            attributes={(facets as any).attributes || {}}
          />
        </aside>

        <div>
          {/* Mobile filter drawer */}
          <details className="lg:hidden mb-4 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            <summary className="px-4 py-3 font-semibold text-sm cursor-pointer select-none flex items-center gap-2 text-surface-700 dark:text-surface-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters & Sort
            </summary>
            <div className="px-4 pb-4">
              <ProductFilters
                brands={JSON.parse(JSON.stringify(brands))}
                categories={JSON.parse(JSON.stringify(categories))}
                attributes={(facets as any).attributes || {}}
              />
            </div>
          </details>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
            {result.items.map((product: any) => (
              <ProductCard key={String(product._id)} product={JSON.parse(JSON.stringify(product))} deliveryDays={pubSettings.deliveryDays} />
            ))}
          </div>

          {/* Empty */}
          {result.items.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="w-7 h-7 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">No products found</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
                Try fewer keywords, fewer filters, or check your spelling.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex justify-center gap-1.5 mt-8 flex-wrap">
              {windowed.map((page) => (
                <a
                  key={page}
                  href={`/shop?${pageParams(sp, page)}`}
                  aria-current={page === result.page ? "page" : undefined}
                  className={`min-w-[36px] h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === result.page
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300"
                  }`}
                >
                  {page}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
