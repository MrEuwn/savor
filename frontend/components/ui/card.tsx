import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("transition-all", {
  variants: {
    variant: {
      neutral: "rounded-[24px] bg-mist-gray p-6 text-ink-black",
      paper: "rounded-[24px] border border-stone-200/80 bg-paper-white p-6 shadow-sm",
      peach: "rounded-[24px] bg-blush-peach p-6 text-sienna-brown",
      artifact:
        "rounded-[20px] border border-black/5 bg-paper-white p-6 shadow-[0_0_0_1px_rgba(4,23,43,0.05),0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]",
    },
  },
  defaultVariants: {
    variant: "paper",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  title?: string;
  subtitle?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, title, subtitle, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      >
        {(title || subtitle) && (
          <div className="mb-4">
            {title && (
              <h3 className="font-serif text-lg font-normal tracking-tight text-current">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-gray">{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

export { Card, cardVariants };

