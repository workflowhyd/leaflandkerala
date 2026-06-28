"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SessionPayload } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { ToastProvider } from "@/components/ui/toast";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/products": "Products",
  "/dashboard/customers": "Customers",
  "/dashboard/orders": "Orders",
  "/dashboard/employees": "Employees",
  "/dashboard/reports": "Reports",
  "/dashboard/maps": "Maps",
  "/dashboard/settings": "Settings",
  "/dashboard/field-visits": "Field Visits",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [key, value] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return value;
  }
  return "Dashboard";
}

interface DashboardClientShellProps {
  children: React.ReactNode;
  session: SessionPayload;
  title: string;
}

export function DashboardClientShell({
  children,
  session,
}: DashboardClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle = getPageTitle(pathname);

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll + handle Escape key when drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKey);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-[#F8F5EE]">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:flex flex-shrink-0 h-full">
          <Sidebar
            userRole={session.role}
            userName={session.name}
            onLogout={handleLogout}
          />
        </div>

        {/* Mobile drawer overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer panel */}
            <div
              className="absolute left-0 top-0 h-full w-64 shadow-2xl"
              style={{ animation: "slideInLeft 0.25s ease-out" }}
            >
              <Sidebar
                userRole={session.role}
                userName={session.name}
                onLogout={handleLogout}
                onClose={() => setMobileMenuOpen(false)}
                isMobile
              />
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopNav
            title={pageTitle}
            userName={session.name}
            userRole={session.role}
            onLogout={handleLogout}
            onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          />
          <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
            {children}
          </main>
          <BottomNav userRole={session.role} />
        </div>
      </div>
    </ToastProvider>
  );
}
