"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SeoMetadataCard from "@/components/admin/SeoMetadataCard";
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

interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
}

interface ProductVariant {
  sku: string;
  price: number;
  salePrice?: number;
  isActive: boolean;
  attributes: Record<string, string>;
}

interface ProductSpecification {
  group: string;
  key: string;
  value: string;
}

interface ProductSeo {
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
  keywords?: string[];
}

interface IProductFormData {
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
  weight: number;
  dimensions: { length: number; width: number; height: number };
  warranty: string;
  returnPolicyDays: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  specifications: ProductSpecification[];
  seo: ProductSeo;
}

const initialFormData: IProductFormData = {
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
  taxRate: 0,
  baseSKU: "",
  hasVariants: false,
  weight: 0,
  dimensions: { length: 0, width: 0, height: 0 },
  warranty: "",
  returnPolicyDays: 7,
  status: "DRAFT",
  isFeatured: false,
  isTrending: false,
  isBestseller: false,
  images: [],
  variants: [],
  specifications: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    keywords: [],
  },
};

export default function AdminProductNewPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dynamic Options State
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [parentCategories, setParentCategories] = useState<CategoryItem[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<IProductFormData>(initialFormData);

  // Fetch options (Categories, Brands) on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/categories?active=false"),
          fetch("/api/brands"),
        ]);

        const [catData, brandData] = await Promise.all([catRes.json(), brandRes.json()]);

        if (catData.success && Array.isArray(catData.data)) {
          const categories: CategoryItem[] = catData.data;
          setAllCategories(categories);

          const parents = categories.filter(
            (cat) => cat.level === 0 || !cat.parentCategoryId
          );
          setParentCategories(parents);
        }

        if (brandData.success) setBrands(brandData.data || []);
      } catch (e) {
        setError("Failed to fetch taxonomy and brand options");
      }
    }

    fetchInitialData();
  }, []);

  // Filter level-1 subcategories when parent Category (level 0) changes
  useEffect(() => {
    if (!formData.categoryId) {
      setFilteredSubcategories([]);
      return;
    }

    const filtered = allCategories.filter((cat) => {
      if (cat.level !== 1) return false;
      const parentId =
        typeof cat.parentCategoryId === "object"
          ? cat.parentCategoryId?._id
          : cat.parentCategoryId;

      return parentId === formData.categoryId;
    });

    setFilteredSubcategories(filtered);
  }, [formData.categoryId, allCategories]);

  // Form Field Handlers
  const handleChange = (field: keyof IProductFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string" && !prev.slug) {
        next.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      return next;
    });
  };

  const handleSeoChange = (field: keyof ProductSeo, value: any) => {
    setFormData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: value,
      },
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      categoryId: selectedCategory,
      subcategoryId: "",
    }));
  };

  // Image Handlers
  const addImage = () => {
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        { url: "", publicId: `manual_${Date.now()}`, alt: "", isPrimary: prev.images.length === 0 },
      ],
    }));
  };

  const updateImage = (index: number, field: keyof ProductImage, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.images];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "isPrimary" && value === true) {
        updated.forEach((img, idx) => {
          if (idx !== index) img.isPrimary = false;
        });
      }
      return { ...prev, images: updated };
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Variant Handlers
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { sku: "", price: prev.basePrice, salePrice: prev.salePrice, isActive: true, attributes: {} },
      ],
    }));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // Specification Handlers
  const addSpecification = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { group: "General", key: "", value: "" }],
    }));
  };

  const updateSpecification = (index: number, field: keyof ProductSpecification, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, specifications: updated };
    });
  };

  const removeSpecification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError("");

    const payload = {
      ...formData,
      description: formData.description || formData.name,
      categoryId: formData.categoryId || null,
      subcategoryId: formData.subcategoryId || null,
      brandId: formData.brandId || null,
      variants: formData.hasVariants
        ? formData.variants
            .filter((v) => v.sku && v.price)
            .map((v) => ({ ...v, sku: v.sku.toUpperCase() }))
        : [],
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Product created successfully!" });
        router.push("/admin/products");
      } else {
        setMessage({
          type: "error",
          text: data.error?.message || data.message || "Failed to create product",
        });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to create product" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">New Product</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/products")}
            className="border-surface-300 dark:border-surface-700 hover:border-surface-400 dark:hover:border-surface-600 text-surface-700 dark:text-surface-300 transition-all rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-xl border border-brand-500/30 hover:border-brand-400 dark:hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/20 active:scale-[0.98] transition-all duration-200"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm border ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/60 text-green-800 dark:text-green-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300"
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
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Wireless Headphones"
                  className="input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleChange("slug", e.target.value.toLowerCase())}
                  placeholder="wireless-headphones"
                  className="input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Base SKU</Label>
                <Input
                  value={formData.baseSKU}
                  onChange={(e) => handleChange("baseSKU", e.target.value.toUpperCase())}
                  placeholder="SKU-1001"
                  className="input"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Short Description</Label>
                <Input
                  value={formData.shortDescription}
                  onChange={(e) => handleChange("shortDescription", e.target.value)}
                  placeholder="Brief summary..."
                  className="input"
                  maxLength={300}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Full Description *</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="input w-full min-h-[120px] py-2"
                  placeholder="Detailed product descriptions..."
                  required
                />
              </div>
            </div>
          </Card>

          {/* Categorization & Brand Dropdowns */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Taxonomy & Brand
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-surface-700 dark:text-surface-300">Category (Level 0) *</Label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  className="input w-full py-2"
                  required
                >
                  <option value="">Select Parent Category</option>
                  {parentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subcategory" className="text-surface-700 dark:text-surface-300">Subcategory (Level 1)</Label>
                <select
                  id="subcategory"
                  value={formData.subcategoryId}
                  onChange={(e) => handleChange("subcategoryId", e.target.value)}
                  disabled={!formData.categoryId || filteredSubcategories.length === 0}
                  className="input w-full py-2 disabled:bg-surface-100 dark:disabled:bg-surface-800 disabled:cursor-not-allowed opacity-70"
                >
                  <option value="">
                    {!formData.categoryId
                      ? "Select Parent Category First"
                      : filteredSubcategories.length === 0
                      ? "No Subcategories Found"
                      : "Select Subcategory"}
                  </option>
                  {filteredSubcategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand" className="text-surface-700 dark:text-surface-300">Brand</Label>
                <select
                  id="brand"
                  value={formData.brandId}
                  onChange={(e) => handleChange("brandId", e.target.value)}
                  className="input w-full py-2"
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand._id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Pricing & Tax */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Pricing & Tax
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Base Price (₹) *</Label>
                <Input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => handleChange("basePrice", parseFloat(e.target.value) || 0)}
                  min="0"
                  className="input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Sale Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => handleChange("salePrice", parseFloat(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Cost Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => handleChange("costPrice", parseFloat(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-surface-700 dark:text-surface-300">Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
            </div>
          </Card>

          {/* Variants */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Variants</h2>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addVariant}
                className="border-surface-300 dark:border-surface-700 hover:border-brand-500 transition-colors rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Variant
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasVariants"
                checked={formData.hasVariants}
                onChange={(e) => handleChange("hasVariants", e.target.checked)}
                className="rounded border-surface-300 dark:border-surface-700 dark:bg-surface-800 text-brand-600 focus:ring-brand-500"
              />
              <Label htmlFor="hasVariants" className="cursor-pointer text-surface-700 dark:text-surface-300">
                Enable multiple variants for this product
              </Label>
            </div>

            {formData.hasVariants && formData.variants.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400 italic">No variants added yet.</p>
            ) : formData.hasVariants ? (
              <div className="space-y-3">
                {formData.variants.map((variant, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs text-surface-600 dark:text-surface-400">SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(i, "sku", e.target.value.toUpperCase())}
                        className="input"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs text-surface-600 dark:text-surface-400">Price (₹)</Label>
                      <Input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(i, "price", parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs text-surface-600 dark:text-surface-400">Sale Price (₹)</Label>
                      <Input
                        type="number"
                        value={variant.salePrice || 0}
                        onChange={(e) => updateVariant(i, "salePrice", parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="p-2 text-surface-500 dark:text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-lg transition-colors mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Specifications */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Specifications</h2>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addSpecification}
                className="border-surface-300 dark:border-surface-700 hover:border-brand-500 transition-colors rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Spec
              </Button>
            </div>

            {formData.specifications.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400 italic">No specifications added.</p>
            ) : (
              <div className="space-y-3">
                {formData.specifications.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Group (e.g. Display)"
                      value={spec.group}
                      onChange={(e) => updateSpecification(i, "group", e.target.value)}
                      className="input w-1/3"
                    />
                    <Input
                      placeholder="Key (e.g. Resolution)"
                      value={spec.key}
                      onChange={(e) => updateSpecification(i, "key", e.target.value)}
                      className="input w-1/3"
                    />
                    <Input
                      placeholder="Value (e.g. 4K OLED)"
                      value={spec.value}
                      onChange={(e) => updateSpecification(i, "value", e.target.value)}
                      className="input w-1/3"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecification(i)}
                      className="p-2 text-surface-500 dark:text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          {/* Status & Badges */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              Status & Visibility
            </h2>

            <div className="space-y-1.5">
              <Label className="text-surface-700 dark:text-surface-300">Status</Label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as IProductFormData["status"])}
                className="input w-full py-2"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-surface-700 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => handleChange("isFeatured", e.target.checked)}
                  className="rounded border-surface-300 dark:border-surface-700 dark:bg-surface-800 text-brand-600 focus:ring-brand-500"
                />
                Featured Product
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer text-surface-700 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={formData.isTrending}
                  onChange={(e) => handleChange("isTrending", e.target.checked)}
                  className="rounded border-surface-300 dark:border-surface-700 dark:bg-surface-800 text-brand-600 focus:ring-brand-500"
                />
                Trending Item
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer text-surface-700 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={formData.isBestseller}
                  onChange={(e) => handleChange("isBestseller", e.target.checked)}
                  className="rounded border-surface-300 dark:border-surface-700 dark:bg-surface-800 text-brand-600 focus:ring-brand-500"
                />
                Bestseller Item
              </label>
            </div>
          </Card>

          {/* Media & Images */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Images</h2>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addImage}
                className="border-surface-300 dark:border-surface-700 hover:border-brand-500 transition-colors rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Image
              </Button>
            </div>

            <ImageUpload
              label="Main Product Image"
              folder="products"
              value={formData.images.find((img) => img.isPrimary)?.url}
              onChange={(data) => {
                if (data) {
                  const hasPrimary = formData.images.some((img) => img.isPrimary);
                  if (hasPrimary) {
                    const updated = formData.images.map((img) =>
                      img.isPrimary ? { ...img, url: data.url, publicId: data.publicId } : img
                    );
                    handleChange("images", updated);
                  } else {
                    handleChange("images", [
                      ...formData.images,
                      { url: data.url, publicId: data.publicId, alt: "", isPrimary: true },
                    ]);
                  }
                } else {
                  handleChange(
                    "images",
                    formData.images.filter((img) => !img.isPrimary)
                  );
                }
              }}
            />

            {formData.images.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-lg">
                <ImageIcon className="w-8 h-8 mx-auto text-surface-400 dark:text-surface-600 mb-2" />
                <p className="text-xs text-surface-500 dark:text-surface-400">No images configured.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700 space-y-2">
                    <div className="flex gap-2">
                      <img
                        src={img.url || "https://via.placeholder.com/80"}
                        alt={img.alt || "Preview"}
                        className="w-14 h-14 object-cover rounded-md bg-surface-100 dark:bg-surface-800 shrink-0 border border-surface-200 dark:border-surface-700"
                      />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Input
                          placeholder="Image URL"
                          value={img.url}
                          onChange={(e) => updateImage(i, "url", e.target.value)}
                          className="input h-8 text-xs"
                        />
                        <Input
                          placeholder="Alt Text"
                          value={img.alt}
                          onChange={(e) => updateImage(i, "alt", e.target.value)}
                          className="input h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-surface-600 dark:text-surface-400">
                        <input
                          type="radio"
                          name="primaryImage"
                          checked={img.isPrimary}
                          onChange={() => updateImage(i, "isPrimary", true)}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                        Primary Image
                      </label>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-danger-600 dark:text-danger-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SEO Metadata */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 border-b border-surface-100 dark:border-surface-800 pb-3">
              SEO Metadata
            </h2>
            <div className="space-y-1.5">
              <Label className="text-surface-700 dark:text-surface-300">Meta Title</Label>
              <Input
                value={formData.seo.metaTitle}
                onChange={(e) => handleSeoChange("metaTitle", e.target.value)}
                maxLength={60}
                placeholder="Meta title..."
                className="input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-surface-700 dark:text-surface-300">Meta Description</Label>
              <textarea
                value={formData.seo.metaDescription}
                onChange={(e) => handleSeoChange("metaDescription", e.target.value)}
                maxLength={160}
                className="input w-full h-20 text-xs py-2"
                placeholder="Meta description..."
              />
            </div>
          </Card>
          <SeoMetadataCard
            formData={{
              ...formData,
              images: formData.images.map((img) => img.url),
            }}
            handleSeoChange={handleSeoChange}
            siteUrl="https://yourstore.com"
          />
        </div>
      </div>
    </form>
  );
}