"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail, MapPin, Percent, Phone } from "lucide-react";

interface Profile {
  name: string; email: string; role: string;
  employee?: {
    territory?: string | null; commissionPercent: number;
    mobile?: string | null; address?: string | null;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/employee/profile")
      .then((r) => r.json())
      .then((d) => { if (d.name) setProfile(d); })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // Clear all local state so the next user on this device starts clean
    localStorage.removeItem("employee_cart");
    localStorage.removeItem("employee_order_queue");
    router.replace("/login");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-3xl font-bold">{profile?.name?.[0] ?? "?"}</span>
        </div>
        <h1 className="text-white text-xl font-bold">{profile?.name}</h1>
        <p className="text-green-100 text-sm mt-0.5">Field Sales Executive</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {[
            { icon: Mail, label: "Email", value: profile?.email },
            { icon: Phone, label: "Mobile", value: profile?.employee?.mobile ?? "—" },
            { icon: MapPin, label: "Territory", value: profile?.employee?.territory ?? "All Areas" },
            { icon: Percent, label: "Commission Rate", value: `${profile?.employee?.commissionPercent ?? 0}%` },
          ].map(({ icon: Icon, label, value }, i, arr) => (
            <div key={label} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <User size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">App Version</p>
              <p className="text-sm font-medium text-gray-800">LeafLand Kerala v1.0</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 py-4 rounded-xl font-semibold text-sm active:bg-red-100 disabled:opacity-60 border border-red-100"
        >
          <LogOut size={16} />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
