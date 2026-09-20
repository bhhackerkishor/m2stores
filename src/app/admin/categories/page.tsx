"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, Edit3, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories?active=false");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error?.message || "Failed to load categories");
      }
    } catch (e) {
      setError("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${slug}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => prev.filter((c) => c.slug !== slug));
      } else {
        alert(data.error?.message || "Failed to delete category");
      }
    } catch (e) {
      alert("Failed to delete category");
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Categories</h1>
          <p className="text-surface-600 mt-1">{categories.length} total categories</p>
        </div>
        <Link href="/admin/categories/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="relative max-w-xs sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-surface-500">Loading categories...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-surface-200 text-surface-500">
          No categories found.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCategories.map((category: any) => (
            <div
              key={category._id}
              className={`bg-white border border-surface-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow ${
                category.level > 0 ? "ml-6 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-10 h-10 object-cover rounded-md bg-surface-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-surface-100 flex items-center justify-center text-surface-400">
                    <Folder className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-surface-900">{category.name}</p>
                    {category.level > 0 && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                        Subcategory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500">{category.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    category.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {category.isActive ? "Active" : "Inactive"}
                </span>

                <Link
                  href={`/admin/categories/${category.slug}`}
                  className="p-2 text-surface-600 hover:text-blue-600 hover:bg-surface-100 rounded-lg transition-colors"
                  title="Edit Category"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => handleDelete(category.slug)}
                  className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-100 rounded-lg transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}