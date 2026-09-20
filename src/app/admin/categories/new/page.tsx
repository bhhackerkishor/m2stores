"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface AttributeRow {
  name: string;
  type: "TEXT" | "SELECT" | "NUMBER";
  options: string; // Comma-separated string in form state
  isFilterable: boolean;
}

export default function AdminCategoryNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    parentCategoryId: "",
    sortOrder: "0",
    isActive: true,
    level:"0",
  });

  const [attributes, setAttributes] = useState<AttributeRow[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories(res.data);
      })
      .catch(() => setError("Failed to fetch categories"));
      console.log(categories);
  }, [categories]);

  const set = (k: string, v: string | boolean) => {
    setForm((f) => {
      const next: any = { ...f, [k]: v };
      if (k === "name" && typeof v === "string" && !f.slug) {
        next.slug = v
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const formattedAttributes = attributes
        .filter((a) => a.name.trim() !== "")
        .map((a) => ({
          name: a.name.trim(),
          type: a.type,
          options:
            a.type === "SELECT"
              ? a.options
                  .split(",")
                  .map((opt) => opt.trim())
                  .filter(Boolean)
              : [],
          isFilterable: a.isFilterable,
        }));


      const payload = {
        name: form.name,
        slug: form.slug.toLowerCase(),
        description: form.description || undefined,
        image: form.image || undefined,
        parentCategoryId: form.parentCategoryId || undefined,
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        attributes: formattedAttributes,
        level:form.level,
      };

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to create category");
        return;
      }

      router.push("/admin/categories");
    } catch (e) {
      setError("Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-surface-900">New Category</h1>
        <Button onClick={() => router.push("/admin/categories")} variant="ghost">
          Cancel
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Section - Primary Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label>Category Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("name", e.target.value)}
                  placeholder="e.g. Footwear, Smartphones"
                />
              </div>

              <div>
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("slug", e.target.value)}
                  placeholder="category-slug"
                />
              </div>

              <div>
                <Label>Parent Category</Label>
                <select
                  value={form.parentCategoryId}
                  onChange={(e) => set("parentCategoryId", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm"
                >
                  <option value="">None (Top Level Category)</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Image URL</Label>
                <Input
                  value={form.image}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("image", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  value={form.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)}
                  placeholder="Enter category description..."
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white h-32 text-sm"
                  maxLength={1000}
                />
              </div>
            </div>
          </Card>

          {/* Attributes Definition Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-surface-900">Category Attributes</h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Define technical attributes that products in this category should support.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAttributes((a) => [
                    ...a,
                    { name: "", type: "TEXT", options: "", isFilterable: false },
                  ])
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Add Attribute
              </Button>
            </div>

            {attributes.length > 0 ? (
              <div className="space-y-4">
                {attributes.map((attr, i) => (
                  <div key={i} className="p-4 bg-surface-50 border border-surface-200 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Attribute Name</Label>
                        <Input
                          placeholder="e.g. Storage, Color, Size"
                          value={attr.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAttributes((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <select
                          value={attr.type}
                          onChange={(e) =>
                            setAttributes((arr) =>
                              arr.map((x, j) =>
                                j === i
                                  ? { ...x, type: e.target.value as "TEXT" | "SELECT" | "NUMBER" }
                                  : x
                              )
                            )
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white text-sm"
                        >
                          <option value="TEXT">TEXT</option>
                          <option value="SELECT">SELECT</option>
                          <option value="NUMBER">NUMBER</option>
                        </select>
                      </div>
                      <div className="flex items-end justify-between">
                        <label className="flex items-center gap-2 text-sm text-surface-700 pb-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={attr.isFilterable}
                            onChange={(e) =>
                              setAttributes((arr) =>
                                arr.map((x, j) => (j === i ? { ...x, isFilterable: e.target.checked } : x))
                              )
                            }
                            className="rounded border-surface-300"
                          />
                          Is Filterable
                        </label>
                        <button
                          type="button"
                          onClick={() => setAttributes((arr) => arr.filter((_, j) => j !== i))}
                          className="text-red-600 hover:text-red-700 p-2 pb-2.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {attr.type === "SELECT" && (
                      <div>
                        <Label className="text-xs">Options (Comma separated)</Label>
                        <Input
                          placeholder="e.g. 64GB, 128GB, 256GB"
                          value={attr.options}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAttributes((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, options: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500 italic">
                No custom attributes defined. Click "Add Attribute" to add parameters like Size, Brand, or Memory.
              </p>
            )}
          </Card>
        </div>

        {/* Right Section - Settings & Submit */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Status & Visibility</h2>
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 text-sm font-medium text-surface-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                Active (Visible on store)
              </label>

              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sortOrder", e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-surface-500 mt-1">Lower values will appear first in navigation.</p>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? "Saving Category..." : "Save Category"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}