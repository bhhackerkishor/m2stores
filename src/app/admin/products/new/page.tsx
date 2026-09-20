"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface VariantRow {
  sku: string;
  color: string;
  size: string;
  price: string;
  salePrice: string;
}

export default function AdminProductNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    categoryId: "",
    brandId: "",
    basePrice: "",
    salePrice: "",
    baseSKU: "",
    hasVariants: false,
  });
  const [variants, setVariants] = useState<VariantRow[]>([{ sku: "", color: "", size: "", price: "", salePrice: "" }]);

  useEffect(() => {
    Promise.all([fetch("/api/categories").then((r) => r.json()), fetch("/api/brands").then((r) => r.json())]).then(
      ([c, b]) => {
        if (c.success) setCategories(c.data);
        if (b.success) setBrands(b.data);
      }
    );
  }, []);

  const set = (k: string, v: string | boolean) => {
    setForm((f) => {
      const next: any = { ...f, [k]: v };
      if (k === "name" && typeof v === "string" && !f.slug) {
        next.slug = v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        description: form.description || form.name,
        shortDescription: form.shortDescription,
        categoryId: form.categoryId,
        brandId: form.brandId || undefined,
        basePrice: parseFloat(form.basePrice) || 0,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
        baseSKU: form.baseSKU || undefined,
        hasVariants: form.hasVariants,
        status: "DRAFT",
        variants: form.hasVariants
          ? variants
              .filter((v) => v.sku && v.price)
              .map((v) => ({
                sku: v.sku.toUpperCase(),
                attributes: { ...(v.color ? { color: v.color } : {}), ...(v.size ? { size: v.size } : {}) },
                price: parseFloat(v.price),
                salePrice: v.salePrice ? parseFloat(v.salePrice) : undefined,
                isActive: true,
              }))
          : [],
      };
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to save product");
        return;
      }
      router.push("/admin/products");
    } catch (e) {
      setError("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-surface-900">New Product</h1>
        <Button onClick={() => router.push("/admin/products")} variant="ghost">Cancel</Button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("name", e.target.value)} placeholder="Enter product name" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("slug", e.target.value)} placeholder="product-slug" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm">
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Brand</Label>
                  <select value={form.brandId} onChange={(e) => set("brandId", e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm">
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Short Description</Label>
                <Input value={form.shortDescription} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("shortDescription", e.target.value)} placeholder="One-line highlight" maxLength={300} />
              </div>
              <div>
                <Label>Description *</Label>
                <textarea value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)} placeholder="Full product description" className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white h-32 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Base Price (₹) *</Label>
                  <Input type="number" min={0} value={form.basePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("basePrice", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Sale Price (₹)</Label>
                  <Input type="number" min={0} value={form.salePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("salePrice", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Base SKU</Label>
                  <Input value={form.baseSKU} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("baseSKU", e.target.value.toUpperCase())} placeholder="SKU-001" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-surface-900">Product Variants</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.hasVariants} onChange={(e) => set("hasVariants", e.target.checked)} /> Has variants
              </label>
            </div>
            {form.hasVariants ? (
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-surface-50 rounded-lg">
                    <Input value={v.sku} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, sku: e.target.value.toUpperCase() } : x)))} placeholder="SKU" />
                    <Input value={v.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} placeholder="Color" />
                    <Input value={v.size} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} placeholder="Size" />
                    <Input type="number" value={v.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="Price" />
                    <div className="flex gap-2">
                      <Input type="number" value={v.salePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariants((arr) => arr.map((x, j) => (j === i ? { ...x, salePrice: e.target.value } : x)))} placeholder="Sale" />
                      <button onClick={() => setVariants((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setVariants((a) => [...a, { sku: "", color: "", size: "", price: "", salePrice: "" }])}>
                  <Plus className="w-4 h-4 mr-2" /> Add Variant
                </Button>
              </div>
            ) : (
              <p className="text-sm text-surface-500">Enable variants for size / color / storage options. Inventory is tracked per-SKU in InventoryState (Phase 4).</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Publish</h2>
            <p className="text-sm text-surface-600 mb-4">Product will be created as DRAFT. Publish from the product list after adding images and inventory.</p>
            <Button className="w-full" size="lg" onClick={handleSave} isLoading={saving}>Save Product</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
