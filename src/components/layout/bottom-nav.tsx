"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const items: BottomNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, adminOnly: true },
];

interface BottomNavProps {
  userRole: "ADMIN" | "EMPLOYEE";
}

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const visibleItems = items.filter((item) => !item.adminOnly || userRole === "ADMIN");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center border-t border-[#e2e8f0] bg-white lg:hidden safe-bottom">
      {visibleItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
              active ? "text-[#1E4D3D]" : "text-[#94a3b8]"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200",
                active ? "bg-[#1E4D3D]/10" : ""
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-[#1E4D3D]" : "text-[#94a3b8]"
                )}
              />
            </div>
            <span className={active ? "text-[#1E4D3D]" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
