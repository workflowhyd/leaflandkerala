"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Bell,
  CalendarRange,
  ClipboardCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: number;
}

interface SidebarProps {
  userRole: "ADMIN" | "EMPLOYEE";
  userName: string;
  onLogout: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  notificationCount?: number;
}

export function Sidebar({ userRole, userName, onLogout, onClose, isMobile, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard },
    { label: "Orders",        href: "/dashboard/orders",        icon: ShoppingCart },
    { label: "Weekly Orders", href: "/dashboard/orders/weekly", icon: CalendarRange, adminOnly: true },
    { label: "Products",      href: "/dashboard/products",      icon: Package },
    { label: "Customers",     href: "/dashboard/customers",     icon: Users },
    { label: "Employees",     href: "/dashboard/employees",     icon: UserCheck, adminOnly: true },
    {
      label: "Approvals",
      href: "/dashboard/approvals",
      icon: ClipboardCheck,
      adminOnly: true,
      badge: notificationCount > 0 ? notificationCount : undefined,
    },
    { label: "Reports",       href: "/dashboard/reports",       icon: BarChart3, adminOnly: true },
    {
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
      adminOnly: true,
    },
    { label: "Settings",      href: "/dashboard/settings",      icon: Settings, adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || userRole === "ADMIN");

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex h-full w-60 flex-col bg-[#1E4D3D] text-[#F8F5EE]">
      <div className="flex h-16 items-center gap-3 border-b border-[#F8F5EE]/10 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Leaf Land Kerala" className="h-9 w-auto brightness-0 invert flex-shrink-0" />
        <div className="flex flex-col leading-tight flex-1 min-w-0">
          <span className="text-[10px] text-[#F8F5EE]/60 uppercase tracking-wider">
            Agriculture ERP
          </span>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-[#F8F5EE]/60 hover:bg-[#F8F5EE]/10 hover:text-[#F8F5EE] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-[#3B7A57] text-[#F8F5EE] shadow-sm border-l-2 border-[#F8F5EE]/60"
                      : "text-[#F8F5EE]/75 hover:bg-[#3B7A57]/40 hover:text-[#F8F5EE]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      active ? "text-[#F8F5EE]" : "text-[#F8F5EE]/60 group-hover:text-[#F8F5EE]"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : active ? (
                    <ChevronRight className="h-3.5 w-3.5 text-[#F8F5EE]/60" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#F8F5EE]/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#3B7A57] text-xs font-bold text-[#F8F5EE]">
            {initials}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-[#F8F5EE]">{userName}</span>
            <span className="text-[10px] text-[#F8F5EE]/50 uppercase tracking-wide">{userRole}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#F8F5EE]/70 transition-colors hover:bg-[#D32F2F]/20 hover:text-[#F8F5EE]"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
