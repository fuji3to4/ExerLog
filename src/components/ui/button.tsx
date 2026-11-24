import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center whitespace-nowrap gap-1.5 rounded-full border border-transparent px-3.5 text-[0.8125rem] font-medium transition-[background-color,box-shadow,color,transform] duration-[120ms] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-9",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-4",
        icon: "size-9 rounded-full p-0",
      },
      variant: {
        default: "bg-[var(--tonal-bg)] text-[var(--tonal-text)] hover:bg-[var(--tonal-bg-hover)]",
        secondary: "border-border bg-transparent text-foreground hover:bg-muted",
        outline: "border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "h-auto min-h-0 rounded-md px-0 py-0 text-[var(--tonal-text)] underline-offset-4 hover:underline",
        destructive: "bg-[var(--danger-bg)] text-[var(--danger-text)] hover:bg-[var(--danger-bg-hover)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
