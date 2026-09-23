"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import SeoMetadataCard from "@/components/admin/SeoMetadataCard";

/* ------------------------------------------------------------------ */
/* Types — mirrors the Product model + variant/attribute storefront use */
/* ------------------------------------------------------------------ */

export interface ProductFormImage {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductFormVariant {
  sku: string;
  price: number;
  salePrice?: number;
  isActive: boolean;
  attributes: Record<string, string>;
  stock: number;
}

export interface ProductFormSpecification {
  group: string;
  key: string;
  value: string;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  subcategoryId: string;
  brandId: string;
  basePrice: number;
  salePrice: number;
  costPrice: number;
  taxRate: number;
  baseSKU: string;
  hasVariants: boolean;
  initialStock: number;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  warranty: string;
  returnPolicyDays: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  tags: string[];
  images: ProductFormImage[];
  variants: ProductFormVariant[];
  specifications: ProductFormSpecification[];
  seo: { metaTitle: string; metaDescription: string; keywords: string[]; ogImage?: string };
}

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  level: number;
  parentCategoryId?: string | { _id: string } | null;
}

interface OptionItem {
  _id: string;
  name: string;
  slug?: string;
}

const emptyForm: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  categoryId: "",
  subcategoryId: "",
  brandId: "",
  basePrice: 0,
  salePrice: 0,
  costPrice: 0,
  taxRate: 18,
  baseSKU: "",
  hasVariants: false,
  initialStock: 0,
  weight: 0,
  dimensions: { length: 0, width: 0, height: 0 },
  warranty: "",
  returnPolicyDays: 7,
  status: "DRAFT",
  isFeatured: false,
  isTrending: false,
  isBestseller: false,
  tags: [],
  images: [],
  variants: [],
  specifications: [],
  seo: { metaTitle: "", metaDescription: "", keywords: [] },
};

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Filter out blank attribute entries (blank name or value). */
function cleanAttributes(attrs: Record<string, string> | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.trim() && String(v ?? "").trim()) out[k.trim()] = String(v).trim();
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Variant attributes editor (Color / Storage / Size — powers the      */
/* storefront VariantSelector + attribute search facets)               */
/* ------------------------------------------------------------------ */

function VariantAttributesEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const entries = Object.entries(value || {});

  const add = () => {
    const name = newName.trim();
    const val = newValue.trim();
    if (!name || !val) return;
    onChange({ ...(value || {}), [name]: val });
    setNewName("");
    setNewValue("");
  };

  const remove = (name: string) => {
    const next = { ...(value || {}) };
    delete next[name];
    onChange(next);
  };

  const updateValue = (name: string, val: string) => {
    onChange({ ...(value || {}), [name]: val });
  };

  return (
    <div className="mt-2 rounded-lg bg-white dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700 p-2.5 space-y-2">
      <p className="text-xs font-semibold text-surface-600 dark:text-surface-300">
        Attributes <span className="font-normal text-surface-400">(e.g. Color: Blue, Storage: 128GB — shown as selectors on the product page)</span>
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-surface-400 dark:text-surface-500 italic">No attributes — add one below.</p>
      ) : (
        entries.map(([name, val]) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-xs font-medium text-surface-700 dark:text-surface-200 w-28 shrink-0 truncate capitalize">{name}</span>
            <Input
              value={val}
              onChange={(e) => updateValue(name, e.target.value)}
              placeholder="Value"
              className="h-8 text-xs"
            />
            <button type="button" onClick={() => remove(name)} className="p-1.5 text-surface-400 hover:text-red-600 shrink-0" aria-label={`Remove ${name}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}
      <div className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. Color)" className="h-8 text-xs w-28" />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value (e.g. Blue)"
          className="h-8 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared form — single source of truth for admin new + edit           */
/* ------------------------------------------------------------------ */

interface AdminProductFormProps {
  mode: "new" | "edit";
  productId?: string;
}

export function AdminProductForm({ mode, productId }: AdminProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [parentCategories, setParentCategories] = useState<CategoryItem[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);

  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [stockBySku, setStockBySku] = useState<Record<string, number>>({});

  // Initial load: taxonomy + brands always; product (+ inventory) too in edit mode
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(isEdit);
        setError("");
        const reqs = [fetch("/api/categories?active=false"), fetch("/api/brands")];
        if (isEdit) {
          reqs.push(fetch(`/api/products/${productId}`));
          reqs.push(fetch(`/api/inventory?productId=${productId}`));
        }
        const responses = await Promise.all(reqs);
        const parsed = await Promise.all(responses.map((r) => r.json().catch(() => null)));
        const catData = parsed[0];
        const brandData = parsed[1];
        const prodData = isEdit ? parsed[2] : null;
        const invData = isEdit ? parsed[3] : null;

        if (catData?.success && Array.isArray(catData.data)) {
          const categories: CategoryItem[] = catData.data;
          setAllCategories(categories);
          setParentCategories(categories.filter((c) => c.level === 0 || !c.parentCategoryId));
        }
        if (brandData?.success) setBrands(brandData.data || []);

        if (isEdit) {
          if (prodData?.success && prodData.data) {
            const p = prodData.data;
            const invRows: Array<{ sku: string; stock: number }> =
              invData?.success && Array.isArray(invData.data) ? invData.data : [];
            const invMap: Record<string, number> = {};
            for (const row of invRows) invMap[String(row.sku).toUpperCase()] = row.stock;
            setStockBySku(invMap);
            setFormData({
              name: p.name || "",
              slug: p.slug || "",
              description: p.description || "",
              shortDescription: p.shortDescription || "",
              categoryId: p.categoryId?._id || p.categoryId || "",
              subcategoryId: p.subcategoryId?._id || p.subcategoryId || "",
              brandId: p.brandId?._id || p.brandId || "",
              basePrice: p.basePrice || 0,
              salePrice: p.salePrice || 0,
              costPrice: p.costPrice || 0,
              taxRate: p.taxRate ?? 18,
              baseSKU: p.baseSKU || "",
              hasVariants: p.hasVariants || (p.variants?.length || 0) > 0,
              initialStock:
                invMap[String(p.baseSKU || "").toUpperCase()] ??
                Object.values(invMap)[0] ??
                0,
              weight: p.weight || 0,
              dimensions: p.dimensions || { length: 0, width: 0, height: 0 },
              warranty: p.warranty || "",
              returnPolicyDays: p.returnPolicyDays ?? 7,
              status: p.status || "DRAFT",
              isFeatured: !!p.isFeatured,
              isTrending: !!p.isTrending,
              isBestseller: !!p.isBestseller,
              tags: p.tags || [],
              images: (p.images || []).map((img: any) => ({
                url: img.url || "",
                publicId: img.publicId || `manual_${Date.now()}`,
                alt: img.alt || "",
                isPrimary: !!img.isPrimary,
              })),
              variants: (p.variants || []).map((v: any) => ({
                sku: v.sku || "",
                price: v.price ?? 0,
                salePrice: v.salePrice ?? 0,
                isActive: v.isActive ?? true,
                attributes: v.attributes || {},
                stock: invMap[String(v.sku || "").toUpperCase()] ?? 0,
              })),
              specifications: p.specifications || [],
              seo: {
                metaTitle: p.seo?.metaTitle || "",
                metaDescription: p.seo?.metaDescription || "",
                keywords: p.seo?.keywords || [],
                ogImage: p.seo?.ogImage || "",
              },
            });
            setTagsInput((p.tags || []).join(", "));
          } else {
            setError(prodData?.error?.message || "Failed to load product details");
          }
        }
      } catch {
        setError("Failed to fetch initial page data");
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (!formData.categoryId) {
      setFilteredSubcategories([]);
      return;
    }
    setFilteredSubcategories(
      allCategories.filter((cat) => {
        if (cat.level !== 1) return false;
        const parentId = typeof cat.parentCategoryId === "object" ? cat.parentCategoryId?._id : cat.parentCategoryId;
        return parentId === formData.categoryId;
      })
    );
  }, [formData.categoryId, allCategories]);

  /* ---------------- handlers ---------------- */

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-slug on create only (never rewrite an existing product URL)
      if (!isEdit && field === "name" && typeof value === "string" && !prev.slug) {
        next.slug = toSlug(value);
      }
      return next;
    });
  };

  const handleSeoChange = (field: "metaTitle" | "metaDescription" | "keywords" | "ogImage", value: any) => {
    setFormData((prev) => ({ ...prev, seo: { ...prev.seo, [field]: value } }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, categoryId: e.target.value, subcategoryId: "" }));
  };

  /* images: Cloudinary upload + custom URL paste, unified list */
  const pushImage = (img: { url: string; publicId: string }) => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, { url: img.url, publicId: img.publicId, alt: "", isPrimary: prev.images.length === 0 }],
    }));
  };

  const addImageUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    pushImage({ url, publicId: `url_${Date.now()}` });
    setUrlInput("");
  };

  const updateImage = (index: number, field: keyof ProductFormImage, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.images];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "isPrimary" && value === true) {
        updated.forEach((img, idx) => { if (idx !== index) img.isPrimary = false; });
      }
      return { ...prev, images: updated };
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  /* variants */
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { sku: "", price: prev.basePrice, salePrice: prev.salePrice, isActive: true, attributes: {}, stock: 0 },
      ],
    }));
  };

  const updateVariant = (index: number, field: keyof ProductFormVariant, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };

  /* specifications */
  const addSpecification = () => {
    setFormData((prev) => ({ ...prev, specifications: [...prev.specifications, { group: "General", key: "", value: "" }] }));
  };

  const updateSpecification = (index: number, field: keyof ProductFormSpecification, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, specifications: updated };
    });
  };

  const removeSpecification = (index: number) => {
    setFormData((prev) => ({ ...prev, specifications: prev.specifications.filter((_, i) => i !== index) }));
  };

  /* submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...formData,
      description: formData.description || formData.name,
      categoryId: formData.categoryId || undefined,
      subcategoryId: formData.subcategoryId || undefined,
      brandId: formData.brandId || undefined,
      tags,
      images: formData.images
        .filter((img) => img.url.trim())
        .map((img) => ({ ...img, publicId: img.publicId || `manual_${Date.now()}` })),
      variants: formData.hasVariants
        ? formData.variants
            .filter((v) => v.sku && v.sku.trim())
            .map((v) => ({
              ...v,
              sku: v.sku.toUpperCase(),
              price: Number(v.price) || 0,
              stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
              attributes: cleanAttributes(v.attributes),
            }))
        : [],
      initialStock: Math.max(0, Math.floor(Number(formData.initialStock) || 0)),
      specifications: formData.specifications.filter((s) => s.group.trim() && s.key.trim() && s.value.trim()),
      seo: {
        metaTitle: formData.seo.metaTitle || undefined,
        metaDescription: formData.seo.metaDescription || undefined,
        keywords: formData.seo.keywords?.length ? formData.seo.keywords : undefined,
        ogImage: formData.seo.ogImage || undefined,
      },
    };

    try {
      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (isEdit) {
          setMessage({ type: "success", text: "Product updated successfully!" });
          router.refresh();
        } else {
          setMessage({ type: "success", text: "Product created successfully!" });
          router.push("/admin/products");
        }
      } else {
        setMessage({ type: "error", text: data?.error?.message || data?.message || `Failed to ${isEdit ? "update" : "create"} product` });
      }
    } catch {
      setMessage({ type: "error", text: `Failed to ${isEdit ? "update" : "create"} product` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-500 dark:text-surface-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
        Loading product details...
      </div>
    );
  }

  const selectStyle =
    "w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">{isEdit ? "Edit Product" : "New Product"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? "Save Changes" : "Save Product"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm border ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Product Name *</Label>
                <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Wireless Headphones" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Slug *</Label>
                <Input value={formData.slug} onChange={(e) => handleChange("slug", e.target.value.toLowerCase())} placeholder="wireless-headphones" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Base SKU</Label>
                <Input value={formData.baseSKU} onChange={(e) => handleChange("baseSKU", e.target.value.toUpperCase())} placeholder="SKU-1001" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Short Description</Label>
                <Input value={formData.shortDescription} onChange={(e) => handleChange("shortDescription", e.target.value)} placeholder="Brief summary..." maxLength={300} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Full Description *</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[120px] transition-colors"
                  placeholder="Detailed product descriptions..."
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Tags <span className="font-normal text-surface-400">(comma separated — powers search)</span></Label>
                <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="headphones, wireless, bluetooth" />
              </div>
            </div>
          </Card>

          {/* Taxonomy & Brand */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Taxonomy & Brand
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-surface-800 dark:text-surface-200">Category (Level 0) *</Label>
                <select id="category" value={formData.categoryId} onChange={handleCategoryChange} className={selectStyle} required>
                  <option value="">Select Parent Category</option>
                  {parentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subcategory" className="text-surface-800 dark:text-surface-200">Subcategory (Level 1)</Label>
                <select
                  id="subcategory"
                  value={formData.subcategoryId}
                  onChange={(e) => handleChange("subcategoryId", e.target.value)}
                  disabled={!formData.categoryId || filteredSubcategories.length === 0}
                  className={`${selectStyle} disabled:bg-surface-100 dark:disabled:bg-surface-800 disabled:cursor-not-allowed`}
                >
                  <option value="">
                    {!formData.categoryId ? "Select Parent Category First" : filteredSubcategories.length === 0 ? "No Subcategories Found" : "Select Subcategory"}
                  </option>
                  {filteredSubcategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand" className="text-surface-800 dark:text-surface-200">Brand</Label>
                <select id="brand" value={formData.brandId} onChange={(e) => handleChange("brandId", e.target.value)} className={selectStyle}>
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand._id}>{brand.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Pricing & Tax */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Pricing & Tax
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Base Price (₹) *</Label>
                <Input type="number" value={formData.basePrice} onChange={(e) => handleChange("basePrice", parseFloat(e.target.value) || 0)} min="0" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Sale Price (₹)</Label>
                <Input type="number" value={formData.salePrice} onChange={(e) => handleChange("salePrice", parseFloat(e.target.value) || 0)} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Cost Price (₹)</Label>
                <Input type="number" value={formData.costPrice} onChange={(e) => handleChange("costPrice", parseFloat(e.target.value) || 0)} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Tax Rate (%)</Label>
                <Input type="number" value={formData.taxRate} onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)} min="0" max="100" />
              </div>
            </div>
            {!formData.hasVariants && (
              <div className="pt-3 border-t border-surface-100 dark:border-surface-800 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-surface-800 dark:text-surface-200">
                    Stock Quantity <span className="font-normal text-surface-400">(initial inventory)</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) => handleChange("initialStock", parseInt(e.target.value, 10) || 0)}
                    min="0"
                  />
                </div>
                <p className="md:col-span-3 text-xs text-surface-500 dark:text-surface-400 self-end pb-1">
                  Saved to inventory automatically when the product is created. Leave 0 to add stock later from Inventory.
                </p>
              </div>
            )}
          </Card>

          {/* Shipping & Warranty */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Shipping & Warranty
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Weight (kg)</Label>
                <Input type="number" value={formData.weight} onChange={(e) => handleChange("weight", parseFloat(e.target.value) || 0)} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Warranty</Label>
                <Input value={formData.warranty} onChange={(e) => handleChange("warranty", e.target.value)} placeholder="e.g. 1 Year Manufacturer Warranty" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Return Policy (days)</Label>
                <Input type="number" value={formData.returnPolicyDays} onChange={(e) => handleChange("returnPolicyDays", parseInt(e.target.value) || 0)} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Length (cm)</Label>
                <Input type="number" value={formData.dimensions.length} onChange={(e) => handleChange("dimensions", { ...formData.dimensions, length: parseFloat(e.target.value) || 0 })} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Width (cm)</Label>
                <Input type="number" value={formData.dimensions.width} onChange={(e) => handleChange("dimensions", { ...formData.dimensions, width: parseFloat(e.target.value) || 0 })} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-800 dark:text-surface-200">Height (cm)</Label>
                <Input type="number" value={formData.dimensions.height} onChange={(e) => handleChange("dimensions", { ...formData.dimensions, height: parseFloat(e.target.value) || 0 })} min="0" />
              </div>
            </div>
          </Card>

          {/* Images — Cloudinary upload + custom URL paste */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Images
            </h2>
            <ImageUpload
              label="Upload to Cloudinary"
              folder="products"
              onChange={(data) => { if (data) pushImage(data); }}
            />
            <div className="flex items-center gap-2">
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="...or paste an image URL (https://...)" className="text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addImageUrl} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add URL
              </Button>
            </div>
            {formData.images.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-lg">
                <ImageIcon className="w-8 h-8 mx-auto text-surface-400 dark:text-surface-500 mb-2" />
                <p className="text-xs text-surface-500 dark:text-surface-400">No images yet — upload or paste a URL above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700 space-y-2">
                    <div className="flex gap-2">
                      <img
                        src={img.url || "/images/placeholder-product.svg"}
                        alt={img.alt || "Preview"}
                        className="w-14 h-14 object-cover rounded-md bg-surface-100 dark:bg-surface-800 shrink-0 border border-surface-200 dark:border-surface-700"
                      />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Input placeholder="Image URL (upload or paste)" value={img.url} onChange={(e) => updateImage(i, "url", e.target.value)} className="h-8 text-xs" />
                        <Input placeholder="Alt Text" value={img.alt} onChange={(e) => updateImage(i, "alt", e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-surface-600 dark:text-surface-300">
                        <input type="radio" name="primaryImage" checked={img.isPrimary} onChange={() => updateImage(i, "isPrimary", true)} className="text-blue-600 dark:bg-surface-800 dark:border-surface-700" />
                        Primary Image
                      </label>
                      <button type="button" onClick={() => removeImage(i)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Variants */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Variants</h2>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="w-4 h-4 mr-1" /> Add Variant
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasVariants"
                checked={formData.hasVariants}
                onChange={(e) => handleChange("hasVariants", e.target.checked)}
                className="rounded border-surface-300 dark:border-surface-700 text-blue-600 focus:ring-blue-500 dark:bg-surface-800"
              />
              <Label htmlFor="hasVariants" className="cursor-pointer text-surface-800 dark:text-surface-200">
                Enable multiple variants for this product
              </Label>
            </div>
            {!formData.hasVariants ? null : formData.variants.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400 italic">No variants added yet.</p>
            ) : (
              <div className="space-y-3">
                {formData.variants.map((variant, i) => (
                  <div key={i} className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[120px] space-y-1">
                        <Label className="text-xs text-surface-700 dark:text-surface-300">SKU *</Label>
                        <Input value={variant.sku} onChange={(e) => updateVariant(i, "sku", e.target.value.toUpperCase())} placeholder="VAR-001" />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs text-surface-700 dark:text-surface-300">Price (₹) *</Label>
                        <Input type="number" value={variant.price} onChange={(e) => updateVariant(i, "price", parseFloat(e.target.value) || 0)} min="0" />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs text-surface-700 dark:text-surface-300">Sale Price (₹)</Label>
                        <Input type="number" value={variant.salePrice || 0} onChange={(e) => updateVariant(i, "salePrice", parseFloat(e.target.value) || 0)} min="0" />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs text-surface-700 dark:text-surface-300">Stock</Label>
                        <Input type="number" value={variant.stock} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value, 10) || 0)} min="0" />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300 mt-5 cursor-pointer">
                        <input type="checkbox" checked={variant.isActive} onChange={(e) => updateVariant(i, "isActive", e.target.checked)} className="rounded border-surface-300 dark:border-surface-700 text-blue-600 focus:ring-blue-500 dark:bg-surface-800" />
                        Active
                      </label>
                      <button type="button" onClick={() => removeVariant(i)} className="p-2 text-surface-600 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors mt-5" aria-label="Remove variant">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <VariantAttributesEditor value={variant.attributes || {}} onChange={(attrs) => updateVariant(i, "attributes", attrs)} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Specifications */}
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Specifications</h2>
              <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                <Plus className="w-4 h-4 mr-1" /> Add Spec
              </Button>
            </div>
            {formData.specifications.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400 italic">No specifications added.</p>
            ) : (
              <div className="space-y-3">
                {formData.specifications.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Group (e.g. Display)" value={spec.group} onChange={(e) => updateSpecification(i, "group", e.target.value)} className="w-1/3" />
                    <Input placeholder="Key (e.g. Resolution)" value={spec.key} onChange={(e) => updateSpecification(i, "key", e.target.value)} className="w-1/3" />
                    <Input placeholder="Value (e.g. 4K OLED)" value={spec.value} onChange={(e) => updateSpecification(i, "value", e.target.value)} className="w-1/3" />
                    <button type="button" onClick={() => removeSpecification(i)} className="p-2 text-surface-600 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors" aria-label="Remove specification">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Status & Visibility
            </h2>
            <div className="space-y-1.5">
              <Label className="text-surface-800 dark:text-surface-200">Status</Label>
              <select value={formData.status} onChange={(e) => handleChange("status", e.target.value)} className={selectStyle}>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              {(
                [
                  ["isFeatured", "Featured Product"],
                  ["isTrending", "Trending Item"],
                  ["isBestseller", "Bestseller Item"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 text-sm cursor-pointer text-surface-700 dark:text-surface-300">
                  <input
                    type="checkbox"
                    checked={formData[field]}
                    onChange={(e) => handleChange(field, e.target.checked)}
                    className="rounded border-surface-300 dark:border-surface-700 text-blue-600 focus:ring-blue-500 dark:bg-surface-800"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Card>

          <SeoMetadataCard
            formData={{
              name: formData.name,
              description: formData.description,
              images: formData.images.map((img) => img.url),
              seo: { metaTitle: formData.seo.metaTitle, metaDescription: formData.seo.metaDescription, ogImage: formData.seo.ogImage },
            }}
            handleSeoChange={(field, value) => handleSeoChange(field as "metaTitle" | "metaDescription" | "ogImage", value)}
            siteUrl="https://m2stores.in"
          />
          <Card className="p-6 space-y-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              SEO Keywords
            </h2>
            <div className="space-y-1.5">
              <Label className="text-surface-800 dark:text-surface-200">Keywords <span className="font-normal text-surface-400">(comma separated)</span></Label>
              <Input
                value={(formData.seo.keywords || []).join(", ")}
                onChange={(e) => handleSeoChange("keywords", e.target.value.split(",").map((k) => k.trim()).filter(Boolean))}
                placeholder="headphones, wireless, bluetooth"
              />
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
