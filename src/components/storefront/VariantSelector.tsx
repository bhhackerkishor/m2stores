// components/storefront/VariantSelector.tsx
"use client";

import { useState } from "react";

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
            <label className="block text-2xs font-bold uppercase tracking-wide text-surface-500 mb-2">
              {name}
            </label>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const isSelected = selectedOptions[name] === option;
                const isActive = variants.some((v) => v.attributes[name] === option && v.isActive);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedOptions((prev) => ({ ...prev, [name]: option }));
                      const selectedVariant = variants.find((v) => v.attributes[name] === option && v.isActive);
                      if (selectedVariant) onSelect?.(selectedVariant.sku);
                    }}
                    disabled={!isActive}
                    className={`px-4 py-2 rounded-sm border text-sm font-semibold transition-colors ${
                      isSelected
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                        : isActive
                        ? "border-surface-200 dark:border-surface-700 hover:border-brand-400"
                        : "border-surface-100 dark:border-surface-800 text-surface-400 cursor-not-allowed"
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