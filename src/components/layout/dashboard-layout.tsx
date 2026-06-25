import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { DashboardClientShell } from "./dashboard-client-shell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export async function DashboardLayout({
  children,
  title = "Dashboard",
}: DashboardLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardClientShell
      session={session}
      title={title}
    >
      {children}
    </DashboardClientShell>
  );
}
