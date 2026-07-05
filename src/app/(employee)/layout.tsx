"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-auth";

export default function EmployeeRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isError, isPending } = useMe();

  useEffect(() => {
    if (isPending) return;
    if (isError || !data?.user) {
      router.replace("/login");
    } else if (data.user.role === "ADMIN") {
      router.replace("/dashboard");
    }
  }, [data, isError, isPending, router]);

  // Usually resolves instantly from the cache primed at login (see login/page.tsx).
  // Only shows on a hard refresh / direct deep-link, so a slow network doesn't look stuck.
  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
