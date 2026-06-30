import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  color?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  color = "#1E4D3D",
  className,
}: StatCardProps) {
  const TrendIcon =
    changeType === "up"
      ? TrendingUp
      : changeType === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    changeType === "up"
      ? "text-[#2E7D32]"
      : changeType === "down"
        ? "text-[#D32F2F]"
        : "text-[#64748b]";

  const trendBg =
    changeType === "up"
      ? "bg-[#2E7D32]/10"
      : changeType === "down"
        ? "bg-[#D32F2F]/10"
        : "bg-[#64748b]/10";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-[#64748b]">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-[#1a1a1a]">
            {value}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendBg,
              trendColor
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {change}
          </span>
          <span className="text-xs text-[#64748b]">vs last month</span>
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 h-1 w-full rounded-b-xl"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
