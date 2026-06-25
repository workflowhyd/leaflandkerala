import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#1E4D3D]/10 text-[#1E4D3D]",
  success: "bg-[#2E7D32]/10 text-[#2E7D32]",
  warning: "bg-[#F9A825]/15 text-[#E65100]",
  danger: "bg-[#D32F2F]/10 text-[#D32F2F]",
  info: "bg-blue-100 text-blue-700",
  outline: "bg-transparent border border-[#e2e8f0] text-[#64748b]",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
