import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, { badge: number; img: number }> = {
  sm: { badge: 40, img: 28 },
  md: { badge: 60, img: 44 },
  lg: { badge: 112, img: 80 },
  xl: { badge: 128, img: 96 },
};

export function Logo({ size = "md", className }: LogoProps) {
  const { badge, img } = SIZE_MAP[size];

  return (
    <div
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/5",
        className
      )}
      style={{
        width: badge,
        height: badge,
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="Leaf Land Kerala"
        style={{ height: img, width: "auto", maxWidth: "100%" }}
      />
    </div>
  );
}
