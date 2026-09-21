import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,opacity,background-color,color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-cyan text-bg hover:opacity-90 shadow-[0_0_24px_color-mix(in_oklab,var(--color-cyan)_35%,transparent)]",
        secondary:
          "border border-border bg-surface text-fg hover:border-cyan/50 hover:text-cyan",
        ghost: "text-muted hover:text-fg hover:bg-surface",
      },
      size: {
        md: "h-12 rounded-[var(--radius-md)] px-5 text-sm",
        lg: "h-14 rounded-[var(--radius-lg)] px-7 text-base",
        icon: "size-12 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
