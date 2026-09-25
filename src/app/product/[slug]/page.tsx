// app/product/[slug]/page.tsx
import type { Metadata } from "next";
import { ProductDetailPage } from "@/components/storefront/ProductDetailPage";
import { ProductViewTracker } from "@/components/storefront/ProductViewTracker";
import { ProductReviews } from "@/components/storefront/ProductReviews";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { FrequentlyBoughtTogether } from "@/components/storefront/FrequentlyBoughtTogether";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CatalogService } from "@/services/catalog.service";
import { getPublicSettings } from "@/lib/public-settings";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product: any = await CatalogService.getProductBySlug(slug);
  if (!product) return { title: "Product Not Found | M2Stores" };
  const title = product.seo?.metaTitle || `${product.name} | M2Stores`;
  const description = product.seo?.metaDescription || product.shortDescription || product.description?.slice(0, 160);
  const image = product.images?.[0]?.url;
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [{ url: image }] : undefined, type: "website" },
    alternates: { canonical: `/product/${product.slug}` },
  };
}

function breadcrumbJsonLd(product: any) {
  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: "/" }];
  if (product.categoryId?.slug) {
    items.push({ "@type": "ListItem", position: 2, name: product.categoryId.name || "Category", item: `/category/${product.categoryId.slug}` });
  }
  items.push({ "@type": "ListItem", position: items.length + 1, name: product.name, item: `/product/${product.slug}` });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

function productJsonLd(product: any) {
  const price = product.salePrice || product.basePrice;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((i: any) => i.url) || [],
    description: product.shortDescription || product.description,
    sku: product.baseSKU || product.slug,
    brand: product.brandId ? { "@type": "Brand", name: product.brandId.name } : undefined,
    aggregateRating:
      product.totalReviews > 0
        ? { "@type": "AggregateRating", ratingValue: product.averageRating, reviewCount: product.totalReviews }
        : undefined,
    offers: { "@type": "Offer", priceCurrency: "INR", price, availability: "https://schema.org/InStock" },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product: any = await CatalogService.getProductBySlug(slug);

  if (!product || product.status !== "PUBLISHED") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-3xl mb-3">Product Not Found</h1>
        <p className="text-surface-600 text-sm mb-8 mx-auto">
          The product you&apos;re looking for doesn&apos;t exist.
        </p>
        <a href="/shop" className="btn btn-primary btn-lg inline-flex">Browse Products</a>
      </div>
    );
  }

  const plain = JSON.parse(JSON.stringify(product));
  const [related, settings] = await Promise.all([
    CatalogService.getRelatedProducts(
      String(product._id),
      String(product.categoryId?._id || product.categoryId),
      product.brandId?._id ? String(product.brandId._id) : undefined,
      8
    ),
    getPublicSettings(),
  ]);

  return (
    <div className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(plain)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(plain)) }} />
      <ProductViewTracker slug={plain.slug} productId={String(product._id)} name={plain.name} price={plain.salePrice || plain.basePrice} />

      <ProductDetailPage product={plain}  />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-2">
        <ProductReviews productId={String(product._id)} />
      </section>

      <FrequentlyBoughtTogether productId={String(product._id)} deliveryDays={settings.deliveryDays} />

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 section-y-sm !pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-balance">Related Products</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((r: any) => (
              <ProductCard key={String(r._id)} product={JSON.parse(JSON.stringify(r))} deliveryDays={settings.deliveryDays} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeSlug={plain.slug} />
    </div>
  );
}