// components/storefront/FrequentlyBoughtTogether.tsx
import { ProductCard } from "@/components/storefront/ProductCard";
import { CatalogService } from "@/services/catalog.service";

export async function FrequentlyBoughtTogether({ productId, deliveryDays = 3 }: { productId: string; deliveryDays?: number }) {
  let items: any[] = [];
  try {
    items = await CatalogService.frequentlyBoughtTogether(productId, 4);
  } catch {
    items = [];
  }
  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 section-y-sm !pt-6">
      <h2 className="text-balance mb-6">Frequently Bought Together</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map((p: any) => (
          <ProductCard key={String(p._id)} product={JSON.parse(JSON.stringify(p))} deliveryDays={deliveryDays} />
        ))}
      </div>
      <p className="text-xs text-surface-400 mt-4">Based on real co-purchases from paid orders.</p>
    </section>
  );
}