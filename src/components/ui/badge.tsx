import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        size === "md" && "px-3 py-1 text-sm",
        variant === "default" && "badge-default",
        variant === "success" && "badge-success",
        variant === "warning" && "badge-warning",
        variant === "danger" && "badge-danger",
        variant === "info" && "badge-info",
        className
      )}
    >
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "success" && "bg-accent-500",
          variant === "warning" && "bg-warning-500",
          variant === "danger" && "bg-danger-500",
          variant === "info" && "bg-brand-500",
          variant === "default" && "bg-surface-400",
        )} />
      )}
      {children}
    </span>
  );
}
