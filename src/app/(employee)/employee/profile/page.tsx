"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut, User, Mail, MapPin, Percent, Phone, IndianRupee,
  ShoppingCart, Package, TrendingUp, Calendar, Hash,
} from "lucide-react";
import { useProfile, useEarnings } from "@/hooks/use-employee-profile";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useProfile();
  const earningsQuery = useEarnings();

  const profile = profileQuery.data;
  const earnings = earningsQuery.data;
  const loading = profileQuery.isPending || earningsQuery.isPending;

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    localStorage.removeItem("employee_cart");
    localStorage.removeItem("employee_order_queue");
    router.replace("/login");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentWeek = earnings?.weeks[0];
  const totalRecentEarnings = earnings?.weeks.reduce((s, w) => s + w.earnings, 0) ?? 0;

  const joinedAt = profile?.employee?.createdAt
    ? new Date(profile.employee.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

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
            { icon: Hash, label: "Employee ID", value: profile?.employee?.id ? `EMP-${profile.employee.id.slice(-6).toUpperCase()}` : "—" },
            { icon: Mail, label: "Email", value: profile?.email },
            { icon: Phone, label: "Mobile", value: profile?.employee?.mobile ?? "—" },
            { icon: MapPin, label: "Territory", value: profile?.employee?.territory ?? "All Areas" },
            { icon: Percent, label: "Commission Rate", value: `${profile?.employee?.commissionPercent ?? 0}%` },
            { icon: Calendar, label: "Joined", value: joinedAt ?? "—" },
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

        {/* Current Week Performance */}
        {currentWeek && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <TrendingUp size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">This Week&apos;s Performance</p>
                  <p className="text-xs text-gray-400">Delivered orders only</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-gray-100">
              {[
                {
                  icon: ShoppingCart,
                  label: "Orders Delivered",
                  value: String(currentWeek.ordersDelivered),
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  icon: Package,
                  label: "Products Delivered",
                  value: String(currentWeek.productsDelivered),
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                },
                {
                  icon: IndianRupee,
                  label: "Total Sales",
                  value: `₹${Math.round(currentWeek.salesAmount).toLocaleString("en-IN")}`,
                  color: "text-orange-600",
                  bg: "bg-orange-50",
                },
                {
                  icon: TrendingUp,
                  label: "Your Earnings",
                  value: `₹${Math.round(currentWeek.earnings).toLocaleString("en-IN")}`,
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-white p-4 flex flex-col gap-2">
                  <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={color} />
                  </div>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {currentWeek.ordersDelivered === 0 && (
              <p className="text-center text-xs text-gray-400 py-3">
                No delivered orders this week yet
              </p>
            )}
          </div>
        )}

        {/* 4-Week History */}
        {earnings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <IndianRupee size={15} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Earnings History</p>
                    <p className="text-xs text-gray-400">Last 4 weeks (delivered orders)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700">₹{Math.round(totalRecentEarnings).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">4-week total</p>
                </div>
              </div>
            </div>

            {/* Week rows */}
            <div className="divide-y divide-gray-50">
              {earnings.weeks.map((week) => (
                <div key={week.weekStart} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-800">{week.label}</p>
                    <p className={`text-sm font-semibold ${week.earnings > 0 ? "text-green-700" : "text-gray-400"}`}>
                      {week.earnings > 0 ? `₹${Math.round(week.earnings).toLocaleString("en-IN")}` : "₹0"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <ShoppingCart size={10} />
                      {week.ordersDelivered} order{week.ordersDelivered !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={10} />
                      {week.productsDelivered} units
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee size={10} />
                      {week.salesAmount > 0 ? `₹${Math.round(week.salesAmount).toLocaleString("en-IN")} sales` : "₹0 sales"}
                    </span>
                  </div>
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
