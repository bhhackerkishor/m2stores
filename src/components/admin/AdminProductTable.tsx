"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  salePrice?: number;
  basePrice?: number;
  status?: string;
  images?: Array<{ url: string }>;
  brandId?: { name?: string } | null;
}

export function AdminProductTable({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    router.push(`/admin/products?${params.toString()}`);
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Archive "${name}"? It will be hidden from the store but kept for order history.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || "Failed to archive product");
      }
      success("Product archived");
      router.refresh();
    } catch (err: any) {
      error("Archive failed", err?.message || "Failed to archive product");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Search */}
      <form onSubmit={onSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 dark:text-surface-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products by name, slug or SKU..."
            className="input pl-11 pr-4 w-80"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-card">
        {products.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-surface-500 dark:text-surface-400">
            No products found.
          </p>
        ) : (
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
              {products.map((product) => (
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
                      <button
                        onClick={() => onDelete(product._id, product.name)}
                        disabled={deletingId === product._id}
                        className="text-danger-600 dark:text-danger-500 text-sm hover:underline disabled:opacity-50"
                      >
                        {deletingId === product._id ? "Archiving..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
