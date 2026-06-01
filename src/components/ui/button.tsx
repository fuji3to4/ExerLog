import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        outline: "border-border bg-card/80 text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "h-auto min-h-0 rounded-md px-0 py-0 text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/30 hover:bg-destructive/90",
      },
      size: {
        default: "h-12",
        sm: "h-10 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "size-12 rounded-2xl p-0",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        size: "default",
        class: "h-auto",
      },
    ],
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
