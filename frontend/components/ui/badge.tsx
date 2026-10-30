import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors select-none",
  {
    variants: {
      tone: {
        neutral: "bg-mist-gray text-slate-gray",
        ink: "bg-ink-black text-paper-white",
        peach: "bg-blush-peach text-sienna-brown",
        tag: "bg-transparent text-ash-gray font-normal px-0 py-0",
        emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
        amber: "bg-amber-50 text-amber-800 border border-amber-200/60",
        red: "bg-red-50 text-red-800 border border-red-200/60",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

