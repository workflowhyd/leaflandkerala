"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SessionPayload } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { ToastProvider } from "@/components/ui/toast";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { SessionTimeoutModal } from "@/components/ui/session-timeout-modal";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/products": "Products",
  "/dashboard/customers": "Customers",
  "/dashboard/orders": "Orders",
  "/dashboard/orders/weekly": "Weekly Orders",
  "/dashboard/employees": "Employees",
  "/dashboard/approvals": "Employee Approvals",
  "/dashboard/returns": "Returns",
  "/dashboard/reports": "Reports",
  "/dashboard/settings": "Settings",
  "/dashboard/notifications": "Notifications",
  "/dashboard/registrations": "Registrations",
  "/dashboard/field-visits": "Field Visits",
  "/dashboard/maps": "Maps",
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
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0);

  const pageTitle = getPageTitle(pathname);

  // Fetch notification count for admin
  useEffect(() => {
    if (session.role !== "ADMIN") return;
    const fetchCount = () => {
      fetch("/api/admin/notifications")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.pendingRegistrations !== undefined) setNotificationCount(d.pendingRegistrations);
          if (d?.pendingReturns !== undefined) setPendingReturnsCount(d.pendingReturns);
        })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [session.role]);

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
    localStorage.removeItem("employee_cart");
    localStorage.removeItem("employee_order_queue");
    router.push("/login");
  };

  const { showWarning, secondsLeft, extendSession, doLogout } = useSessionTimeout();

  return (
    <ToastProvider>
      <SessionTimeoutModal
        open={showWarning}
        secondsLeft={secondsLeft}
        onStay={extendSession}
        onLogout={doLogout}
      />
      <div className="flex h-screen overflow-hidden bg-[#F8F5EE]">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:flex flex-shrink-0 h-full">
          <Sidebar
            userRole={session.role}
            userName={session.name}
            onLogout={handleLogout}
            notificationCount={notificationCount}
            pendingReturnsCount={pendingReturnsCount}
          />
        </div>

        {/* Mobile drawer overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            aria-modal="true"
            role="dialog"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-64 shadow-2xl">
              <Sidebar
                userRole={session.role}
                userName={session.name}
                onLogout={handleLogout}
                onClose={() => setMobileMenuOpen(false)}
                isMobile
                notificationCount={notificationCount}
                pendingReturnsCount={pendingReturnsCount}
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
            notificationCount={notificationCount}
            onLogout={handleLogout}
            onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          />
          <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
            {children}
          </main>
          <BottomNav userRole={session.role} notificationCount={notificationCount} />
        </div>
      </div>
    </ToastProvider>
  );
}
