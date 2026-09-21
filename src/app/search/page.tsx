import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductFilters } from "@/components/storefront/ProductFilters";
import { SearchAutocomplete } from "@/components/storefront/SearchAutocomplete";
import { SearchTracker } from "@/components/storefront/SearchTracker";
import { CatalogService } from "@/services/catalog.service";
import { getPublicSettings } from "@/lib/public-settings";

export const metadata: Metadata = {
  title: "Search | M2Stores",
  description: "Search products across M2Stores.",
  alternates: { canonical: "/search" },
};

interface SearchParams {
  q?: string;
  sort?: string;
  brand?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  inStock?: string;
  page?: string;
  [key: string]: string | undefined;
}

function parseAttrs(sp: SearchParams): Record<string, string[]> | undefined {
  const attrs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k.startsWith("attr_") && v) {
      const vals = v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);
      if (vals.length) attrs[k.slice(5)] = vals;
    }
  }
  return Object.keys(attrs).length ? attrs : undefined;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = sp.q || "";

  const [result, brands, categories, facets, pubSettings] = await Promise.all([
    q
      ? CatalogService.listProducts({
          q,
          sort: (sp.sort as any) || "relevance",
          brandId: sp.brand,
          categoryId: sp.category,
          minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
          maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
          minRating: sp.minRating ? parseFloat(sp.minRating) : undefined,
          inStock: sp.inStock === "true" ? true : undefined,
          attrs: parseAttrs(sp),
          page: sp.page ? parseInt(sp.page) : 1,
          limit: 12,
        })
      : { items: [], total: 0, page: 1, limit: 12, totalPages: 0 },
    CatalogService.getBrands(true),
    CatalogService.getCategories(true),
    q
      ? CatalogService.getFacets({
          q,
          brandId: sp.brand,
          categoryId: sp.category,
          minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
          maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
          minRating: sp.minRating ? parseFloat(sp.minRating) : undefined,
          inStock: sp.inStock === "true" ? true : undefined,
          attrs: parseAttrs(sp),
        }).catch(() => ({ attributes: {} as Record<string, Array<{ value: string; count: number }>> }))
      : { attributes: {} as Record<string, Array<{ value: string; count: number }>> },
    getPublicSettings(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-surface-900 mb-4">Search</h1>
      <div className="max-w-xl mb-8">
        <SearchAutocomplete />
      </div>
      {q && <SearchTracker query={q} total={result.total} />}

      {q ? (
        <>
          <p className="text-surface-600 mb-6">
            {result.total} result{result.total === 1 ? "" : "s"} for &quot;{q}&quot;
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            <aside className="hidden lg:block">
              <ProductFilters
                brands={JSON.parse(JSON.stringify(brands))}
                categories={JSON.parse(JSON.stringify(categories))}
                attributes={(facets as any).attributes || {}}
              />
            </aside>
            <div>
              <details className="lg:hidden mb-4 bg-white rounded-xl border border-surface-200 px-4 py-3">
                <summary className="font-semibold text-sm cursor-pointer">Filters & Sort</summary>
                <div className="pt-3">
                  <ProductFilters
                    brands={JSON.parse(JSON.stringify(brands))}
                    categories={JSON.parse(JSON.stringify(categories))}
                    attributes={(facets as any).attributes || {}}
                  />
                </div>
              </details>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
                {result.items.map((p: any) => (
                  <ProductCard key={String(p._id)} product={JSON.parse(JSON.stringify(p))} deliveryDays={pubSettings.deliveryDays} />
                ))}
              </div>
              {result.items.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-surface-200 mt-6">
                  <p className="text-5xl mb-4">🔍</p>
                  <h3 className="text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-surface-600">Try fewer keywords, fewer filters, or browse categories.</p>
                </div>
              )}
              {result.totalPages > 1 && (
                <nav aria-label="Pagination" className="flex justify-center gap-2 mt-8 flex-wrap">
                  {Array.from({ length: Math.min(result.totalPages, 10) }).map((_, i) => {
                    const page = i + 1;
                    const params = new URLSearchParams();
                    for (const [k, v] of Object.entries(sp)) {
                      if (v && k !== "page") params.set(k, v);
                    }
                    params.set("page", String(page));
                    return (
                      <a key={page} href={`/search?${params.toString()}`} className={`px-4 py-2 rounded-lg text-sm font-medium ${page === result.page ? "bg-blue-600 text-white" : "bg-white border border-surface-200"}`}>
                        {page}
                      </a>
                    );
                  })}
                </nav>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-surface-200">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-surface-600">Type at least 2 characters to search products, brands and categories.</p>
        </div>
      )}
    </div>
  );
}
