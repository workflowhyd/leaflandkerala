"use client";

import { useRouter } from "next/navigation";
import { SessionPayload } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface DashboardClientShellProps {
  children: React.ReactNode;
  session: SessionPayload;
  title: string;
}

export function DashboardClientShell({
  children,
  session,
  title,
}: DashboardClientShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F5EE]">
      <div className="flex-shrink-0">
        <Sidebar
          userRole={session.role}
          userName={session.name}
          onLogout={handleLogout}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          title={title}
          userName={session.name}
          userRole={session.role}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
