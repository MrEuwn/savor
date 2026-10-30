import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-[48px] w-full rounded-[16px] border border-stone-200 bg-paper-white px-4 py-3 text-sm text-ink-black placeholder:text-smoke-gray transition-colors focus-visible:border-ink-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-black disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

