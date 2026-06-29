"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Verify session on mount
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) router.replace("/login");
        if (data.user?.role === "ADMIN") router.replace("/dashboard");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return <>{children}</>;
}
