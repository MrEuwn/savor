import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-black/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-ink-black text-paper-white hover:bg-ink-black/90 active:scale-[0.98]",
        ghost:
          "border border-ink-black bg-transparent text-ink-black hover:bg-mist-gray/50 active:scale-[0.98]",
        outline:
          "border border-stone-200 bg-paper-white text-ink-black hover:bg-mist-gray/60 active:scale-[0.98]",
        accent:
          "bg-blush-peach text-sienna-brown hover:bg-blush-peach/85 active:scale-[0.98]",
        danger:
          "border border-red-200 bg-red-50/60 text-red-700 hover:bg-red-100/70 active:scale-[0.98]",
      },
      size: {
        default: "min-h-[44px] px-6 py-2.5 text-sm",
        sm: "min-h-[38px] px-4 py-1.5 text-xs",
        lg: "min-h-[50px] px-8 py-3.5 text-base",
        icon: "h-11 w-11 rounded-full p-0 flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

