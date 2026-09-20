"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Sparkles, Image as ImageIcon, ExternalLink } from "lucide-react";

export interface SeoData {
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
}

export interface ProductSeoFormData {
  name: string;
  description?: string;
  images?: string[];
  seo: SeoData;
}

interface SeoMetadataCardProps {
  formData: ProductSeoFormData;
  handleSeoChange: (field: keyof SeoData, value: string) => void;
  siteUrl?: string;
}

export default function SeoMetadataCard({
  formData,
  handleSeoChange,
  siteUrl = "https://yourstore.com",
}: SeoMetadataCardProps) {
  // Computed fallbacks for empty inputs
  const displayTitle =
    formData.seo.metaTitle.trim() || formData.name || "Product Name Title";
  const displayDescription =
    formData.seo.metaDescription.trim() ||
    formData.description?.replace(/<[^>]*>?/gm, "") ||
    "Add a meta description to show how your product appears in search engine results and social shares.";
  const displayImage =
    formData.seo.ogImage ||
    formData.images?.[0] ||
    "https://placehold.co/600x314/f1f5f9/94a3b8?text=Product+Image";

  // URL Slug generation preview
  const slug = formData.name
    ? formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    : "product-slug";

  // Status indicators for length guidance
  const getTitleStatus = (len: number) => {
    if (len === 0) return { text: "Tag Too Short", color: "text-amber-500 dark:text-amber-400" };
    if (len < 30) return { text: "Too Short", color: "text-amber-500 dark:text-amber-400" };
    if (len > 60) return { text: "Too Long", color: "text-red-500 dark:text-red-400" };
    return { text: "Optimal Length", color: "text-emerald-500 dark:text-emerald-400" };
  };

  const getDescriptionStatus = (len: number) => {
    if (len === 0) return { text: "Tag Too Short", color: "text-amber-500 dark:text-amber-400" };
    if (len < 80) return { text: "Too Short", color: "text-amber-500 dark:text-amber-400" };
    if (len > 160) return { text: "Too Long", color: "text-red-500 dark:text-red-400" };
    return { text: "Optimal Length", color: "text-emerald-500 dark:text-emerald-400" };
  };

  const titleStatus = getTitleStatus(formData.seo.metaTitle.length);
  const descStatus = getDescriptionStatus(formData.seo.metaDescription.length);

  // Instant Generators
  const generateTitle = () => {
    if (formData.name) {
      handleSeoChange("metaTitle", formData.name.slice(0, 60));
    }
  };

  const generateDescription = () => {
    if (formData.description) {
      const plainText = formData.description.replace(/<[^>]*>?/gm, "");
      handleSeoChange("metaDescription", plainText.slice(0, 160));
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
      <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          SEO Metadata
        </h2>
        <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
          Dukaan-style Live Preview
        </span>
      </div>

      {/* --- FORM FIELDS --- */}
      <div className="space-y-4">
        {/* Meta Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <Label className="text-surface-700 dark:text-surface-300 font-medium">
              Meta Title
            </Label>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${titleStatus.color}`}>
                {titleStatus.text}
              </span>
              <span className="text-surface-400 dark:text-surface-500">
                {formData.seo.metaTitle.length}/60
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateTitle}
                className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Title
              </Button>
            </div>
          </div>
          <Input
            value={formData.seo.metaTitle}
            onChange={(e) => handleSeoChange("metaTitle", e.target.value)}
            maxLength={60}
            placeholder={formData.name || "Meta title..."}
            className="bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500"
          />
        </div>

        {/* Meta Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <Label className="text-surface-700 dark:text-surface-300 font-medium">
              Meta Description
            </Label>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${descStatus.color}`}>
                {descStatus.text}
              </span>
              <span className="text-surface-400 dark:text-surface-500">
                {formData.seo.metaDescription.length}/160
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateDescription}
                className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Description
              </Button>
            </div>
          </div>
          <textarea
            value={formData.seo.metaDescription}
            onChange={(e) => handleSeoChange("metaDescription", e.target.value)}
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder={
              formData.description?.replace(/<[^>]*>?/gm, "") ||
              "Meta description..."
            }
          />
        </div>

        {/* Social Image Override */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <Label className="text-surface-700 dark:text-surface-300 font-medium">
              Social Sharing Image URL (Optional)
            </Label>
            {formData.images?.[0] && !formData.seo.ogImage && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Using Primary Product Image
              </span>
            )}
          </div>
          <Input
            value={formData.seo.ogImage || ""}
            onChange={(e) => handleSeoChange("ogImage", e.target.value)}
            placeholder={formData.images?.[0] || "https://example.com/og-image.jpg"}
            className="bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 text-xs"
          />
        </div>
      </div>

      {/* --- PREVIEWS --- */}
      <div className="space-y-4 pt-4 border-t border-surface-100 dark:border-surface-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
          Live Previews
        </h3>

        {/* 1. Google Search Card Preview */}
        <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800/80 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400 mb-1">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-surface-800 dark:text-surface-200">
              Google Search Preview
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300">
            <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
              G
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs text-surface-900 dark:text-surface-100 font-medium truncate">
                {siteUrl.replace(/^https?:\/\//, "")}
              </span>
              <span className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                {siteUrl} &gt; products &gt; {slug}
              </span>
            </div>
          </div>

          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-base text-[#1a0dab] dark:text-[#8ab4f8] hover:underline font-normal block truncate"
          >
            {displayTitle}
          </a>

          <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-normal">
            {displayDescription}
          </p>
        </div>

        {/* 2. Social Share Card Preview */}
        <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-surface-600 dark:text-surface-400 mb-1">
            <span className="font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              Social Sharing Image Preview
            </span>
            <span className="text-[10px] text-surface-400">1200 x 628 (1.91:1)</span>
          </div>

          <div className="max-w-md mx-auto rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden bg-white dark:bg-surface-900 shadow-sm">
            <div className="relative aspect-[1.91/1] w-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
              <img
                src={displayImage}
                alt="Social Share Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/600x314/f1f5f9/94a3b8?text=Image+Not+Found";
                }}
              />
            </div>

            <div className="p-3 bg-surface-50/50 dark:bg-surface-900/80 space-y-1 border-t border-surface-100 dark:border-surface-800">
              <p className="text-[10px] uppercase font-semibold text-surface-400 dark:text-surface-500 tracking-wider truncate">
                {siteUrl.replace(/^https?:\/\//, "")}
              </p>
              <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                {displayTitle}
              </p>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-2 leading-relaxed">
                {displayDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}