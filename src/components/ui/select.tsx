import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-[#1a1a1a]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full appearance-none rounded-md border bg-white px-3 py-2 pr-9 text-sm text-[#1a1a1a] transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent",
              "disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:opacity-60",
              error
                ? "border-[#D32F2F] focus:ring-[#D32F2F]"
                : "border-[#e2e8f0] hover:border-[#3B7A57]",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
        </div>
        {error && <p className="text-xs text-[#D32F2F]">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[#64748b]">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
