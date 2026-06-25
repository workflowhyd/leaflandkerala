import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[#1a1a1a]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          className={cn(
            "w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#64748b] transition-colors duration-150 resize-y min-h-[80px]",
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

Textarea.displayName = "Textarea";
