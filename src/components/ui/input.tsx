import { InputHTMLAttributes, ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  errorId?: string;
}

export function Input({
  className,
  error,
  success,
  leftIcon,
  rightIcon,
  errorId,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        id={inputId}
        className={cn(
          "input",
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          error && "input-error",
          success && "input-success",
          className
        )}
        aria-invalid={error || undefined}
        aria-describedby={errorId || undefined}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
          {rightIcon}
        </span>
      )}
    </div>
  );
}
