import { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={cn(`block text-sm font-medium text-surface-700 mb-1`, className)} {...props}>
      {children}
    </label>
  );
}
