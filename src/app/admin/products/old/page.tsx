"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, Star, UploadCloud, Image as ImageIcon } from "lucide-react";

interface VariantItem {
  sku: string;
  price: number;
  salePrice?: number;
  attributes: string; // Stored as JSON string in UI
  isActive: boolean;
}

interface SpecItem {
  group: string;
  key: string;
  value: string;
}

interface ImageItem {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
}

export default function AdminProductEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [form, setForm] = useState({
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
    length: 0,
    width: 0,
    height: 0,
    warranty: "",
    returnPolicyDays: 7,
    tags: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    status: "DRAFT",
    isFeatured: false,
    isTrending: false,
    isBestseller: false,
  });

  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [specifications, setSpecifications] = useState<SpecItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/categories?active=true").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      fetch(`/api/products/${slug}`).then((r) => r.json()),
    ])
      .then(([categoriesRes, brandsRes, productRes]) => {
        if (categoriesRes.success) setCategories(categoriesRes.data || []);
        if (brandsRes.success) setBrands(brandsRes.data || []);

        if (productRes.success) {
          const p = productRes.data;
          setForm({
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
            taxRate: p.taxRate || 0,
            baseSKU: p.baseSKU || "",
            hasVariants: !!p.hasVariants,
            weight: p.weight || 0,
            length: p.dimensions?.length || 0,
            width: p.dimensions?.width || 0,
            height: p.dimensions?.height || 0,
            warranty: p.warranty || "",
            returnPolicyDays: p.returnPolicyDays ?? 7,
            tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
            metaTitle: p.seo?.metaTitle || "",
            metaDescription: p.seo?.metaDescription || "",
            keywords: Array.isArray(p.seo?.keywords) ? p.seo.keywords.join(", ") : "",
            status: p.status || "DRAFT",
            isFeatured: !!p.isFeatured,
            isTrending: !!p.isTrending,
            isBestseller: !!p.isBestseller,
          });

          if (p.variants && Array.isArray(p.variants)) {
            setVariants(
              p.variants.map((v: any) => ({
                sku: v.sku || "",
                price: v.price || 0,
                salePrice: v.salePrice || 0,
                attributes: JSON.stringify(v.attributes || {}),
                isActive: v.isActive ?? true,
              }))
            );
          }

          if (p.specifications && Array.isArray(p.specifications)) {
            setSpecifications(p.specifications);
          }

          if (p.images && Array.isArray(p.images)) {
            setImages(p.images);
          }
        } else {
          setError("Product not found");
        }
      })
      .catch(() => setError("Failed to load product details"))
      .finally(() => setLoading(false));
  }, [slug]);

  const setField = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        url: newImageUrl.trim(),
        publicId: `img_${Date.now()}`,
        alt: form.name,
        isPrimary: prev.length === 0,
      },
    ]);
    setNewImageUrl("");
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const formattedVariants = variants.map((v) => {
        let parsedAttr = {};
        try {
          parsedAttr = JSON.parse(v.attributes);
        } catch {
          parsedAttr = {};
        }
        return {
          sku: v.sku.toUpperCase(),
          price: Number(v.price),
          salePrice: v.salePrice ? Number(v.salePrice) : undefined,
          attributes: parsedAttr,
          isActive: v.isActive,
        };
      });

      const payload = {
        name: form.name,
        slug: form.slug.toLowerCase(),
        description: form.description,
        shortDescription: form.shortDescription || undefined,
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || undefined,
        brandId: form.brandId || undefined,
        basePrice: Number(form.basePrice),
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        taxRate: Number(form.taxRate),
        hasVariants: form.hasVariants,
        baseSKU: form.baseSKU || undefined,
        variants: form.hasVariants ? formattedVariants : [],
        specifications: specifications.filter((s) => s.key && s.value),
        images,
        weight: Number(form.weight) || undefined,
        dimensions: {
          length: Number(form.length) || 0,
          width: Number(form.width) || 0,
          height: Number(form.height) || 0,
        },
        warranty: form.warranty || undefined,
        returnPolicyDays: Number(form.returnPolicyDays),
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        seo: {
          metaTitle: form.metaTitle || undefined,
          metaDescription: form.metaDescription || undefined,
          keywords: form.keywords
            ? form.keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
            : [],
        },
        status: form.status,
        isFeatured: form.isFeatured,
        isTrending: form.isTrending,
        isBestseller: form.isBestseller,
      };

      const res = await fetch(`/api/products/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to update product");
        return;
      }

      router.push("/admin/products");
    } catch (e) {
      setError("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-surface-500">Loading product data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/products")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-surface-900">Edit Product</h1>
        </div>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Saving Changes..." : "Save Product"}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Samsung Galaxy S24 Ultra"
                />
              </div>

              <div>
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  placeholder="samsung-galaxy-s24-ultra"
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <Input
                  value={form.shortDescription}
                  onChange={(e) => setField("shortDescription", e.target.value)}
                  placeholder="Brief summary for product cards..."
                />
              </div>

              <div>
                <Label>Full Description *</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Detailed product specification and features..."
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white h-32 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* Pricing & Inventory */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Pricing & Identification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Base Price (₹) *</Label>
                <Input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setField("basePrice", e.target.value)}
                />
              </div>
              <div>
                <Label>Sale Price (₹)</Label>
                <Input
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => setField("salePrice", e.target.value)}
                />
              </div>
              <div>
                <Label>Cost Price (₹)</Label>
                <Input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setField("costPrice", e.target.value)}
                />
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={form.taxRate}
                  onChange={(e) => setField("taxRate", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Base SKU</Label>
                <Input
                  value={form.baseSKU}
                  onChange={(e) => setField("baseSKU", e.target.value)}
                  placeholder="SAMS-S24U-BASE"
                />
              </div>
            </div>
          </Card>

          {/* Variants Management */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-surface-900">Product Variants</h2>
                <p className="text-xs text-surface-500">Enable if product has multiple SKUs (Color, Size, Storage)</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.hasVariants}
                  onChange={(e) => setField("hasVariants", e.target.checked)}
                  className="rounded border-surface-300"
                />
                Has Variants
              </label>
            </div>

            {form.hasVariants && (
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <div key={i} className="p-4 bg-surface-50 border border-surface-200 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">SKU *</Label>
                        <Input
                          value={v.sku}
                          onChange={(e) =>
                            setVariants((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x))
                            )
                          }
                          placeholder="SKU-123"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price (₹) *</Label>
                        <Input
                          type="number"
                          value={v.price}
                          onChange={(e) =>
                            setVariants((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x))
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Sale Price (₹)</Label>
                        <Input
                          type="number"
                          value={v.salePrice || ""}
                          onChange={(e) =>
                            setVariants((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, salePrice: Number(e.target.value) } : x))
                            )
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Attributes (JSON format: &#123;&quot;Color&quot;: &quot;Black&quot;&#125;)</Label>
                      <Input
                        value={v.attributes}
                        onChange={(e) =>
                          setVariants((arr) =>
                            arr.map((x, j) => (j === i ? { ...x, attributes: e.target.value } : x))
                          )
                        }
                        placeholder='{"Color": "Black", "Storage": "256GB"}'
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-surface-600">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={(e) =>
                            setVariants((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x))
                            )
                          }
                        />
                        Active Variant
                      </label>

                      <button
                        type="button"
                        onClick={() => setVariants((arr) => arr.filter((_, j) => j !== i))}
                        className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVariants((prev) => [
                      ...prev,
                      { sku: "", price: form.basePrice, salePrice: 0, attributes: "{}", isActive: true },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Variant
                </Button>
              </div>
            )}
          </Card>

          {/* Specifications */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-surface-900">Technical Specifications</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSpecifications((prev) => [...prev, { group: "General", key: "", value: "" }])
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Add Spec
              </Button>
            </div>

            <div className="space-y-3">
              {specifications.map((spec, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center gap-2">
                  <Input
                    placeholder="Group (e.g. Display)"
                    value={spec.group}
                    className="w-full sm:w-1/4"
                    onChange={(e) =>
                      setSpecifications((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, group: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    placeholder="Key (e.g. Screen Size)"
                    value={spec.key}
                    className="w-full sm:w-1/3"
                    onChange={(e) =>
                      setSpecifications((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    placeholder="Value (e.g. 6.8 inches)"
                    value={spec.value}
                    className="w-full sm:flex-1"
                    onChange={(e) =>
                      setSpecifications((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setSpecifications((arr) => arr.filter((_, j) => j !== i))}
                    className="text-red-600 p-2 hover:bg-surface-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* SEO Metadata */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">SEO Settings</h2>
            <div className="space-y-4">
              <div>
                <Label>Meta Title</Label>
                <Input
                  value={form.metaTitle}
                  onChange={(e) => setField("metaTitle", e.target.value)}
                  placeholder="Meta title for search engines"
                  maxLength={60}
                />
              </div>

              <div>
                <Label>Meta Description</Label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setField("metaDescription", e.target.value)}
                  placeholder="Meta description for search engines..."
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white h-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={160}
                />
              </div>

              <div>
                <Label>Keywords (Comma separated)</Label>
                <Input
                  value={form.keywords}
                  onChange={(e) => setField("keywords", e.target.value)}
                  placeholder="smartphone, samsung, galaxy, ultra"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Sidebar Controls & Media */}
        <div className="space-y-6">
          {/* Status & Badges */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Publishing Status</h2>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="border-t border-surface-200 pt-4 space-y-2">
                <label className="flex items-center gap-3 text-sm font-medium text-surface-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setField("isFeatured", e.target.checked)}
                    className="rounded border-surface-300"
                  />
                  Featured Product
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-surface-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isTrending}
                    onChange={(e) => setField("isTrending", e.target.checked)}
                    className="rounded border-surface-300"
                  />
                  Trending Product
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-surface-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isBestseller}
                    onChange={(e) => setField("isBestseller", e.target.checked)}
                    className="rounded border-surface-300"
                  />
                  Bestseller
                </label>
              </div>
            </div>
          </Card>

          {/* Product Media / Images */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Product Images</h2>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Paste Image URL"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <Button type="button" size="sm" onClick={handleAddImage}>
                Add
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative group border border-surface-200 rounded-lg overflow-hidden bg-surface-50">
                  <img src={img.url} alt={img.alt || "Product"} className="w-full h-28 object-cover" />
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryImage(i)}
                      className={`p-1.5 rounded-full ${img.isPrimary ? "bg-amber-500 text-white" : "bg-white text-surface-700"}`}
                      title={img.isPrimary ? "Primary Image" : "Set as Primary"}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                      className="p-1.5 bg-red-600 text-white rounded-full"
                      title="Delete Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {img.isPrimary && (
                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Categorization & Organization */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Organization</h2>
            <div className="space-y-4">
              <div>
                <Label>Category *</Label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Brand</Label>
                <select
                  value={form.brandId}
                  onChange={(e) => setField("brandId", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tags (Comma separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setField("tags", e.target.value)}
                  placeholder="flagship, 5g, android"
                />
              </div>
            </div>
          </Card>

          {/* Shipping & Logistics */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Shipping Specs</h2>
            <div className="space-y-3">
              <div>
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={form.weight}
                  onChange={(e) => setField("weight", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Length (cm)</Label>
                  <Input
                    type="number"
                    value={form.length}
                    onChange={(e) => setField("length", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Width (cm)</Label>
                  <Input
                    type="number"
                    value={form.width}
                    onChange={(e) => setField("width", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Height (cm)</Label>
                  <Input
                    type="number"
                    value={form.height}
                    onChange={(e) => setField("height", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Warranty Period</Label>
                <Input
                  value={form.warranty}
                  onChange={(e) => setField("warranty", e.target.value)}
                  placeholder="1 Year Brand Warranty"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}