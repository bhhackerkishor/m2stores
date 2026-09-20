import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CatalogService } from "@/services/catalog.service";

export async function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  let items: any[] = [];
  try {
    items = await CatalogService.frequentlyBoughtTogether(productId, 4);
  } catch {
    items = [];
  }
  if (items.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <h2 className="text-2xl font-bold text-surface-900 mb-6">Frequently Bought Together</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((p: any) => (
          <ProductCard key={String(p._id)} product={JSON.parse(JSON.stringify(p))} />
        ))}
      </div>
      <p className="text-xs text-surface-400 mt-3">Based on real co-purchases from paid orders.</p>
    </section>
  );
}
