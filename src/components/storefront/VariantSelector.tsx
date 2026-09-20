"use client";

import { useState } from "react";

interface VariantOption {
  name: string;
  value: string;
}

interface VariantSelectorProps {
  variants: Array<{
    sku: string;
    attributes: Record<string, string>;
    price: number;
    salePrice?: number;
    isActive: boolean;
  }>;
  variantNames: string[];
  onSelect?: (sku: string) => void;
}

export function VariantSelector({ variants, variantNames, onSelect }: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  if (!variantNames || variantNames.length === 0) {
    return <div className="text-sm text-surface-500">No variants available</div>;
  }

  return (
    <div className="space-y-4">
      {variantNames.map((name) => {
        const options = [...new Set(variants.map((v) => v.attributes[name]))].filter(Boolean);
        return (
          <div key={name}>
            <label className="block text-sm font-medium text-surface-700 mb-2 capitalize">{name}</label>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const isSelected = selectedOptions[name] === option;
                const isActive = variants.some(
                  (v) => v.attributes[name] === option && v.isActive
                );
                return (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedOptions((prev) => ({ ...prev, [name]: option }));
                      const selectedVariant = variants.find(
                        (v) => v.attributes[name] === option && v.isActive
                      );
                      if (selectedVariant) onSelect?.(selectedVariant.sku);
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : isActive
                        ? "border-surface-200 hover:border-surface-400"
                        : "border-surface-100 text-surface-400 cursor-not-allowed"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
