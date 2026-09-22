import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

async function getProducts() {
  const res = await fetch("http://localhost:3000/api/products?limit=50", { cache: "no-store" });
  const data = await res.json();
  return data.success ? data.data : [];
}

export default async function AdminProductsPage() {
  const products = await getProducts();

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

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 dark:text-surface-500" />
          <input
            type="text"
            placeholder="Search products..."
            className="input pl-11 pr-4 w-80"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-card">
        <table className="w-full">
          <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Brand</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
            {products.map((product: any) => (
              <tr key={product._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.images?.[0]?.url || "/images/placeholder-product.svg"}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-surface-100 dark:bg-surface-800"
                    />
                    <div>
                      <p className="font-medium text-surface-900 dark:text-surface-100">{product.name}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">{product.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-300">{product.brandId?.name || "-"}</td>
                <td className="px-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-100">
                  ₹{product.salePrice || product.basePrice}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${
                      product.status === "PUBLISHED" ? "badge-success" : "badge-warning"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/products/${product._id}/edit`} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">
                      Edit
                    </Link>
                    <button className="text-danger-600 dark:text-danger-500 text-sm hover:underline">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}