import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#1a1a1a]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#64748b] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:opacity-60",
            error
              ? "border-[#D32F2F] focus:ring-[#D32F2F]"
              : "border-[#e2e8f0] hover:border-[#3B7A57]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#D32F2F]">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[#64748b]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
