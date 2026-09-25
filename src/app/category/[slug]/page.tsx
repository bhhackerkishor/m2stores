import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductFilters } from "@/components/storefront/ProductFilters";
import { CategoryMegaMenu } from "@/components/layout/CategoryMegaMenu";
import { CatalogService } from "@/services/catalog.service";
import { getPublicSettings } from "@/lib/public-settings";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category: any = await CatalogService.getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found | M2Stores" };
  return {
    title: `${category.name} | M2Stores`,
    description: category.description || `Shop ${category.name} online in India.`,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: `${category.name} | M2Stores`,
      description: category.description || `Shop ${category.name} online in India.`,
      type: "website",
    },
  };
}

function parseAttrs(sp: Record<string, string | undefined>): Record<string, string[]> | undefined {
  const attrs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k.startsWith("attr_") && v) {
      const vals = v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);
      if (vals.length) attrs[k.slice(5)] = vals;
    }
  }
  return Object.keys(attrs).length ? attrs : undefined;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; brand?: string; minPrice?: string; maxPrice?: string; minRating?: string; inStock?: string; page?: string; [key: string]: string | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category: any = await CatalogService.getCategoryBySlug(slug);

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-surface-900 mb-4">Category Not Found</h1>
        <p className="text-surface-600 mb-8">The category you&apos;re looking for doesn&apos;t exist.</p>
        <a href="/shop" className="btn-primary inline-block">Browse Products</a>
      </div>
    );
  }

  const baseFilters = {
    categoryId: String(category._id),
    brandId: sp.brand,
    sort: (sp.sort as any) || "relevance",
    minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
    minRating: sp.minRating ? parseFloat(sp.minRating) : undefined,
    inStock: sp.inStock === "true" ? true : undefined,
    attrs: parseAttrs(sp),
  };

  const [result, brands, allCategories, facets, pubSettings] = await Promise.all([
    CatalogService.listProducts({ ...baseFilters, page: sp.page ? parseInt(sp.page) : 1, limit: 12 }),
    CatalogService.getBrands(true),
    CatalogService.getCategories(true),
    CatalogService.getFacets(baseFilters).catch(() => ({ attributes: {} as Record<string, Array<{ value: string; count: number }>> })),
    getPublicSettings(),
  ]);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: category.name, item: `/category/${category.slug}` },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <nav aria-label="Breadcrumb" className="text-sm text-surface-500 mb-2">
            <a href="/" className="hover:text-blue-600">Home</a> / <span className="text-surface-900">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-surface-900 mb-2">{category.name}</h1>
          {category.description && <p className="text-surface-600 mb-2">{category.description}</p>}
          <p className="text-sm text-surface-500">{result.total} products</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <aside className="hidden lg:block">
            <ProductFilters
              brands={JSON.parse(JSON.stringify(brands))}
              categories={JSON.parse(JSON.stringify(allCategories))}
              attributes={(facets as any).attributes || {}}
              showCategory={false}
            />
          </aside>
          <div>
            <details className="lg:hidden mb-4 bg-white rounded-xl border border-surface-200 px-4 py-3">
              <summary className="font-semibold text-sm cursor-pointer">Filters & Sort</summary>
              <div className="pt-3">
                <ProductFilters
                  brands={JSON.parse(JSON.stringify(brands))}
                  categories={JSON.parse(JSON.stringify(allCategories))}
                  attributes={(facets as any).attributes || {}}
                  showCategory={false}
                />
              </div>
            </details>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
            {result.items.map((product: any) => (
              <ProductCard key={String(product._id)} product={JSON.parse(JSON.stringify(product))} deliveryDays={pubSettings.deliveryDays} />
            ))}
            {result.items.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-xl border border-surface-200">
                <p className="text-5xl mb-4">📦</p>
                <h3 className="text-xl font-semibold mb-2">No products match these filters</h3>
                <p className="text-surface-600">Try removing a filter or two.</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
