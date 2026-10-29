import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-transparent px-3.5 text-[0.8125rem] font-semibold transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-9",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-4",
        icon: "size-9 rounded-xl p-0",
      },
      variant: {
        default: "bg-[var(--tonal-bg)] text-[var(--tonal-text)] hover:bg-[var(--tonal-bg-hover)]",
        secondary: "border-border bg-transparent text-foreground hover:bg-muted",
        outline: "border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "h-auto min-h-0 rounded-md px-0 py-0 text-primary underline-offset-4 hover:underline",
        destructive: "border-destructive/30 bg-[var(--danger-bg)] text-[var(--danger-text)] hover:bg-[var(--danger-bg-hover)]",
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
