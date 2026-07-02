"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail, MapPin, Percent, Phone, IndianRupee, ShoppingCart } from "lucide-react";

interface Profile {
  name: string; email: string; role: string;
  employee?: {
    territory?: string | null; commissionPercent: number;
    mobile?: string | null; address?: string | null;
  };
}

interface WeekEarning {
  label: string;
  weekStart: string;
  earnings: number;
  ordersCount: number;
}

interface EarningsData {
  commissionPercent: number;
  weeks: WeekEarning[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/employee/profile").then((r) => r.json()),
      fetch("/api/employee/earnings").then((r) => r.json()).catch(() => null),
    ]).then(([profileData, earningsData]) => {
      if (profileData.name) setProfile(profileData);
      if (earningsData && !earningsData.error) setEarnings(earningsData);
    }).finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("employee_cart");
    localStorage.removeItem("employee_order_queue");
    router.replace("/login");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalRecentEarnings = earnings?.weeks.reduce((s, w) => s + w.earnings, 0) ?? 0;
  const maxEarnings = Math.max(...(earnings?.weeks.map((w) => w.earnings) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-3xl font-bold">{profile?.name?.[0] ?? "?"}</span>
        </div>
        <h1 className="text-white text-xl font-bold">{profile?.name}</h1>
        <p className="text-green-100 text-sm mt-0.5">Field Sales Executive</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Profile details */}
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

        {/* 4-Week Earnings */}
        {earnings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <IndianRupee size={15} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Recent Earnings</p>
                    <p className="text-xs text-gray-400">Last 4 weeks</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700">₹{Math.round(totalRecentEarnings).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">4-week total</p>
                </div>
              </div>
            </div>

            {/* Mini bar chart */}
            <div className="px-4 py-3 flex items-end gap-2 h-20">
              {earnings.weeks.map((week) => {
                const pct = Math.round((week.earnings / maxEarnings) * 100);
                return (
                  <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm bg-green-500" style={{ height: `${Math.max(pct, week.earnings > 0 ? 6 : 2)}px`, maxHeight: "48px", opacity: week.earnings > 0 ? 1 : 0.2 }} />
                    <span className="text-[9px] text-gray-400 text-center leading-tight">{week.label.split(" ").slice(0, 2).join(" ")}</span>
                  </div>
                );
              })}
            </div>

            {/* Week rows */}
            <div className="divide-y divide-gray-50">
              {earnings.weeks.map((week) => (
                <div key={week.weekStart} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                      <ShoppingCart size={13} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{week.label}</p>
                      <p className="text-xs text-gray-400">{week.ordersCount} order{week.ordersCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${week.earnings > 0 ? "text-green-700" : "text-gray-400"}`}>
                    {week.earnings > 0 ? `₹${Math.round(week.earnings).toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* App version */}
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
