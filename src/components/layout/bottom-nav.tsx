"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Users, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: number;
}

interface BottomNavProps {
  userRole: "ADMIN" | "EMPLOYEE";
  notificationCount?: number;
}

export function BottomNav({ userRole, notificationCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const items: BottomNavItem[] = [
    { label: "Dashboard", href: "/dashboard",           icon: LayoutDashboard },
    { label: "Orders",    href: "/dashboard/orders",    icon: ShoppingCart },
    { label: "Customers", href: "/dashboard/customers", icon: Users },
    {
      label: "Alerts",
      href: "/dashboard/notifications",
      icon: Bell,
      adminOnly: true,
      badge: notificationCount > 0 ? notificationCount : undefined,
    },
    { label: "Settings",  href: "/dashboard/settings",  icon: Settings, adminOnly: true },
  ];

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
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg">
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-[#1E4D3D]" : "text-[#94a3b8]"
                )}
              />
              {item.badge && item.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </div>
            <span className={active ? "text-[#1E4D3D]" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
