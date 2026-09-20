import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  as?: "div" | "article" | "section";
}

export function Card({ children, className, hover = false, as: Tag = "div", ...props }: CardProps) {
  return (
    <Tag className={cn(hover ? "card-hover" : "card", className)} {...props}>
      {children}
    </Tag>
  );
}
