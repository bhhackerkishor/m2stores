"use client";

import { useEffect, useState, use } from "react";
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
  AlertCircle 
} from "lucide-react";

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminProductEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dynamic Options State
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [parentCategories, setParentCategories] = useState<CategoryItem[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);

  // Form State
  const [formData, setFormData] = useState({
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
    images: [] as { url: string; publicId: string; alt: string; isPrimary: boolean }[],
    variants: [] as { sku: string; price: number; salePrice?: number; isActive: boolean; attributes: Record<string, string> }[],
    specifications: [] as { group: string; key: string; value: string }[],
    seo: { metaTitle: "", metaDescription: "", keywords: [] as string[] },
  });

  // Fetch product data and categories on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        setError("");

        const [catRes, brandRes, prodRes] = await Promise.all([
          fetch("/api/categories?active=false"),
          fetch("/api/brands"),
          fetch(`/api/products/${id}`),
        ]);

        const [catData, brandData, prodData] = await Promise.all([
          catRes.json(),
          brandRes.json(),
          prodRes.json(),
        ]);

        if (catData.success && Array.isArray(catData.data)) {
          const categories: CategoryItem[] = catData.data;
          setAllCategories(categories);

          // Top-level categories have level 0 or no parentCategoryId
          const parents = categories.filter(
            (cat) => cat.level === 0 || !cat.parentCategoryId
          );
          setParentCategories(parents);
        }

        if (brandData.success) setBrands(brandData.data || []);

        if (prodData.success && prodData.data) {
          const product = prodData.data;

          const catId = product.categoryId?._id || product.categoryId || "";
          const subCatId = product.subcategoryId?._id || product.subcategoryId || "";
          const brandId = product.brandId?._id || product.brandId || "";

          setFormData({
            name: product.name || "",
            slug: product.slug || "",
            description: product.description || "",
            shortDescription: product.shortDescription || "",
            categoryId: catId,
            subcategoryId: subCatId,
            brandId: brandId,
            basePrice: product.basePrice || 0,
            salePrice: product.salePrice || 0,
            costPrice: product.costPrice || 0,
            taxRate: product.taxRate || 0,
            baseSKU: product.baseSKU || "",
            hasVariants: product.hasVariants || false,
            weight: product.weight || 0,
            dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
            warranty: product.warranty || "",
            returnPolicyDays: product.returnPolicyDays ?? 7,
            status: product.status || "DRAFT",
            isFeatured: product.isFeatured || false,
            isTrending: product.isTrending || false,
            isBestseller: product.isBestseller || false,
            images: product.images || [],
            variants: product.variants || [],
            specifications: product.specifications || [],
            seo: {
              metaTitle: product.seo?.metaTitle || "",
              metaDescription: product.seo?.metaDescription || "",
              keywords: product.seo?.keywords || [],
            },
          });
        } else {
          setError(prodData.error?.message || "Failed to load product details");
        }
      } catch (e) {
        setError("Failed to fetch initial page data");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [id]);

  // Dynamically filter subcategories (level 1) when Category (level 0) changes
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
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSeoChange = (field: "metaTitle" | "metaDescription" | "keywords", value: any) => {
    setFormData((prev) => ({ ...prev, seo: { ...prev.seo, [field]: value } }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      categoryId: selectedCategory,
      subcategoryId: "", // Reset subcategory when parent category changes
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

  const updateImage = (index: number, field: string, value: any) => {
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

  const updateVariant = (index: number, field: string, value: any) => {
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

  const updateSpecification = (index: number, field: string, value: string) => {
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

    // Sanitize empty strings to avoid Mongoose CastError on ObjectIds
    const payload = {
      ...formData,
      categoryId: formData.categoryId || null,
      subcategoryId: formData.subcategoryId || null,
      brandId: formData.brandId || null,
    };

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Product updated successfully!" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error?.message || data.message || "Failed to update product" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update product" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-500 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        Loading product details...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center text-sm text-surface-600 hover:text-surface-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-surface-900">Edit Product</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6 space-y-4 border border-surface-200">
            <h2 className="text-xl font-semibold text-surface-900 border-b border-surface-100 pb-3">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Wireless Headphones"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleChange("slug", e.target.value.toLowerCase())}
                  placeholder="wireless-headphones"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Base SKU</Label>
                <Input
                  value={formData.baseSKU}
                  onChange={(e) => handleChange("baseSKU", e.target.value)}
                  placeholder="SKU-1001"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label>Short Description</Label>
                <Input
                  value={formData.shortDescription}
                  onChange={(e) => handleChange("shortDescription", e.target.value)}
                  placeholder="Brief summary..."
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label>Full Description *</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[120px]"
                  placeholder="Detailed product descriptions..."
                  required
                />
              </div>
            </div>
          </Card>

          {/* Categorization & Brand Dropdowns */}
          <Card className="p-6 space-y-4 border border-surface-200">
            <h2 className="text-xl font-semibold text-surface-900 border-b border-surface-100 pb-3">
              Taxonomy & Brand
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Dropdown (Level 0) */}
              <div className="space-y-1.5">
                <Label htmlFor="category">Category (Level 0)</Label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select Parent Category</option>
                  {parentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Dropdown (Level 1 filtered by parentCategoryId) */}
              <div className="space-y-1.5">
                <Label htmlFor="subcategory">Subcategory (Level 1)</Label>
                <select
                  id="subcategory"
                  value={formData.subcategoryId}
                  onChange={(e) => handleChange("subcategoryId", e.target.value)}
                  disabled={!formData.categoryId || filteredSubcategories.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-surface-100 disabled:cursor-not-allowed"
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

              {/* Brand Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand</Label>
                <select
                  id="brand"
                  value={formData.brandId}
                  onChange={(e) => handleChange("brandId", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
          <Card className="p-6 space-y-4 border border-surface-200">
            <h2 className="text-xl font-semibold text-surface-900 border-b border-surface-100 pb-3">
              Pricing & Tax
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Base Price (₹) *</Label>
                <Input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => handleChange("basePrice", parseFloat(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sale Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => handleChange("salePrice", parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => handleChange("costPrice", parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>
          </Card>

          {/* Variants */}
          <Card className="p-6 space-y-4 border border-surface-200">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-xl font-semibold text-surface-900">Variants</h2>
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
                className="rounded border-surface-300"
              />
              <Label htmlFor="hasVariants" className="cursor-pointer">
                Enable multiple variants for this product
              </Label>
            </div>

            {formData.variants.length === 0 ? (
              <p className="text-sm text-surface-500 italic">No variants added yet.</p>
            ) : (
              <div className="space-y-3">
                {formData.variants.map((variant, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-200">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(i, "sku", e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Price (₹)</Label>
                      <Input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(i, "price", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Sale Price (₹)</Label>
                      <Input
                        type="number"
                        value={variant.salePrice || 0}
                        onChange={(e) => updateVariant(i, "salePrice", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="p-2 text-surface-600 hover:text-red-600 rounded-lg transition-colors mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Specifications */}
          <Card className="p-6 space-y-4 border border-surface-200">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-xl font-semibold text-surface-900">Specifications</h2>
              <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                <Plus className="w-4 h-4 mr-1" /> Add Spec
              </Button>
            </div>

            {formData.specifications.length === 0 ? (
              <p className="text-sm text-surface-500 italic">No specifications added.</p>
            ) : (
              <div className="space-y-3">
                {formData.specifications.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Group (e.g. Display)"
                      value={spec.group}
                      onChange={(e) => updateSpecification(i, "group", e.target.value)}
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Key (e.g. Resolution)"
                      value={spec.key}
                      onChange={(e) => updateSpecification(i, "key", e.target.value)}
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Value (e.g. 4K OLED)"
                      value={spec.value}
                      onChange={(e) => updateSpecification(i, "value", e.target.value)}
                      className="w-1/3"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecification(i)}
                      className="p-2 text-surface-600 hover:text-red-600 rounded-lg transition-colors"
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
          <Card className="p-6 space-y-4 border border-surface-200">
            <h2 className="text-xl font-semibold text-surface-900 border-b border-surface-100 pb-3">
              Status & Visibility
            </h2>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-surface-100">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-surface-700">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => handleChange("isFeatured", e.target.checked)}
                  className="rounded border-surface-300"
                />
                Featured Product
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer text-surface-700">
                <input
                  type="checkbox"
                  checked={formData.isTrending}
                  onChange={(e) => handleChange("isTrending", e.target.checked)}
                  className="rounded border-surface-300"
                />
                Trending Item
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer text-surface-700">
                <input
                  type="checkbox"
                  checked={formData.isBestseller}
                  onChange={(e) => handleChange("isBestseller", e.target.checked)}
                  className="rounded border-surface-300"
                />
                Bestseller Item
              </label>
            </div>
          </Card>

          {/* Media & Images */}
          <Card className="p-6 space-y-4 border border-surface-200">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-xl font-semibold text-surface-900">Images</h2>
              <Button type="button" variant="outline" size="sm" onClick={addImage}>
                <Plus className="w-4 h-4 mr-1" /> Add Image
              </Button>
            </div>

            {formData.images.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-surface-200 rounded-lg">
                <ImageIcon className="w-8 h-8 mx-auto text-surface-400 mb-2" />
                <p className="text-xs text-surface-500">No images configured.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
                    <div className="flex gap-2">
                      <img
                        src={img.url || "https://via.placeholder.com/80"}
                        alt={img.alt || "Preview"}
                        className="w-14 h-14 object-cover rounded-md bg-surface-100 shrink-0 border border-surface-200"
                      />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Input
                          placeholder="Image URL"
                          value={img.url}
                          onChange={(e) => updateImage(i, "url", e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Alt Text"
                          value={img.alt}
                          onChange={(e) => updateImage(i, "alt", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-surface-600">
                        <input
                          type="radio"
                          name="primaryImage"
                          checked={img.isPrimary}
                          onChange={() => updateImage(i, "isPrimary", true)}
                        />
                        Primary Image
                      </label>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-red-600 hover:text-red-700"
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
          <Card className="p-6 space-y-4 border border-surface-200">
            <h2 className="text-xl font-semibold text-surface-900 border-b border-surface-100 pb-3">
              SEO Metadata
            </h2>
            <div className="space-y-1.5">
              <Label>Meta Title</Label>
              <Input
                value={formData.seo.metaTitle}
                onChange={(e) => handleSeoChange("metaTitle", e.target.value)}
                maxLength={60}
                placeholder="Meta title..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meta Description</Label>
              <textarea
                value={formData.seo.metaDescription}
                onChange={(e) => handleSeoChange("metaDescription", e.target.value)}
                maxLength={160}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-xs h-20 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Meta description..."
              />
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}