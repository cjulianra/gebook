import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "info-soft" | "neutral-soft" | "danger-soft";
type Size = "xs" | "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--color-ink-900)] text-white hover:opacity-90 disabled:bg-[var(--color-ink-300)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink-900)] border border-[var(--color-border-strong)] hover:bg-[var(--color-canvas)]",
  ghost: "bg-transparent text-[var(--color-ink-700)] hover:bg-black/5",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  accent: "text-[var(--color-accent-ink)] hover:opacity-90 [background:var(--gradient-accent-strong)]",
  "info-soft": "bg-[var(--color-info-soft)] text-[var(--color-info)] hover:opacity-80",
  "neutral-soft": "bg-[var(--color-canvas)] text-[var(--color-ink-700)] hover:bg-[var(--color-border)]",
  "danger-soft": "bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-3 text-xs",
  sm: "h-8 px-4 text-sm",
  md: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] font-medium transition-all active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
