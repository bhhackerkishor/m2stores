"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Loader2, 
  X, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Building2 
} from "lucide-react";

interface IBrand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  isActive: boolean;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<IBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<IBrand | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    description: "",
    isActive: true,
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/brands?active=false");
      const data = await res.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch brands", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openCreateDrawer = () => {
    setEditingBrand(null);
    setFormData({ name: "", logo: "", description: "", isActive: true });
    setFeedback(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (brand: IBrand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      logo: brand.logo || "",
      description: brand.description || "",
      isActive: brand.isActive,
    });
    setFeedback(null);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingBrand(null);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const isEdit = Boolean(editingBrand);
    const endpoint = isEdit ? `/api/brands/${editingBrand!._id}` : "/api/brands";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchBrands();
        closeDrawer();
      } else {
        setFeedback({
          type: "error",
          text: data.error?.message || data.message || "Failed to save brand",
        });
      }
    } catch (error) {
      setFeedback({ type: "error", text: "An error occurred while saving" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brand?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok && data.success) {
        setBrands((prev) => prev.filter((b) => b._id !== id));
      } else {
        alert(data.error?.message || "Failed to delete brand");
      }
    } catch (error) {
      alert("Failed to delete brand");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Brands</h1>
          <p className="text-surface-600 mt-1">Manage brand entities and visibility</p>
        </div>
        <Button onClick={openCreateDrawer}>
          <Plus className="w-4 h-4 mr-2" /> Add Brand
        </Button>
      </div>

      {/* Toolbar & Search */}
      <div className="flex items-center gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <Input
            placeholder="Search brands by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-surface-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          Loading brands...
        </div>
      ) : filteredBrands.length === 0 ? (
        <Card className="p-12 text-center text-surface-500">
          <Building2 className="w-12 h-12 mx-auto text-surface-300 mb-3" />
          <p className="text-lg font-medium text-surface-700">No brands found</p>
          <p className="text-sm text-surface-500 mt-1">
            {searchQuery ? "Try refining your search terms" : "Click 'Add Brand' to create your first brand"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => (
            <Card key={brand._id} className="p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="w-14 h-14 rounded-lg object-cover border border-surface-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-surface-100 rounded-lg flex items-center justify-center text-surface-500 font-bold text-lg shrink-0 border border-surface-200">
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-surface-900 truncate">{brand.name}</p>
                    <p className="text-xs text-surface-500 truncate">{brand.slug}</p>
                  </div>
                </div>

                {brand.description && (
                  <p className="text-xs text-surface-600 mt-3 line-clamp-2">{brand.description}</p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    brand.isActive ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {brand.isActive ? "Active" : "Inactive"}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDrawer(brand)}
                    className="h-8 px-2 text-surface-600 hover:text-blue-600"
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === brand._id}
                    onClick={() => handleDelete(brand._id)}
                    className="h-8 px-2 text-surface-600 hover:text-red-600"
                  >
                    {deletingId === brand._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unified Side Drawer (Create / Edit) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="p-6 border-b border-surface-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-surface-900">
                  {editingBrand ? "Edit Brand" : "Create Brand"}
                </h2>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-1 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="brand-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                {feedback && (
                  <div
                    className={`p-3 rounded-lg text-sm flex items-center gap-2 border ${
                      feedback.type === "success"
                        ? "bg-green-50 text-green-800 border-green-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    )}
                    {feedback.text}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="brand-name">Brand Name *</Label>
                  <Input
                    id="brand-name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Sony, Apple, Nike"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brand-logo">Logo URL</Label>
                  <Input
                    id="brand-logo"
                    value={formData.logo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brand-description">Description</Label>
                  <textarea
                    id="brand-description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Brief description of the brand..."
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-surface-700">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-surface-300 text-blue-600 focus:ring-blue-500"
                    />
                    Active Status
                  </label>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-surface-100 bg-surface-50 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDrawer}>
                Cancel
              </Button>
              <Button type="submit" form="brand-form" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Brand"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}