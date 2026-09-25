import { cn } from "@/lib/utils";

const ATTR_LABELS: Record<string, string> = {
  size: "Size",
  color: "Colour",
  colour: "Colour",
  storage: "Storage",
  ram: "RAM",
  capacity: "Capacity",
  material: "Material",
  fit: "Fit",
  pattern: "Pattern",
  sleeve: "Sleeve",
};

export function attrLabel(key: string): string {
  return ATTR_LABELS[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatAttrs(attributes?: Record<string, string | number> | null): string {
  if (!attributes) return "";
  return Object.entries(attributes)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${attrLabel(k)}: ${v}`)
    .join(" · ");
}

interface VariantChipsProps {
  attributes?: Record<string, string | number> | null;
  className?: string;
  size?: "sm" | "xs";
}

/** Small pills showing a variant's attributes (Size: S, Colour: Blue). */
export function VariantChips({ attributes, className, size = "sm" }: VariantChipsProps) {
  if (!attributes) return null;
  const entries = Object.entries(attributes).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5 mt-1", className)}>
      {entries.map(([k, v]) => (
        <span
          key={k}
          className={cn(
            "inline-flex items-center rounded-md border font-semibold bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300",
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0 text-[10px]"
          )}
        >
          {attrLabel(k)}: {String(v)}
        </span>
      ))}
    </div>
  );
}
