import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { AdminProductTable } from "@/components/admin/AdminProductTable";

async function getProducts(q?: string) {
  try {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { slug: rx }, { baseSKU: rx }];
    }
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("brandId", "name")
      .lean();
    // Serialize for client component boundary
    return JSON.parse(JSON.stringify(products));
  } catch (error) {
    console.error("Admin products fetch failed:", error);
    return [];
  }
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const products = await getProducts(params?.q);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Products</h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">{products.length} products in catalog</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Link>
      </div>

      <Suspense fallback={<p className="text-sm text-surface-500">Loading products...</p>}>
        <AdminProductTable products={products} />
      </Suspense>
    </div>
  );
}
