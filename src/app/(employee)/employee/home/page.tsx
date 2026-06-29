"use client";
import { useEffect, useState } from "react";
import { Package, IndianRupee, Clock, Truck, CheckCircle, Circle } from "lucide-react";

interface HomeData {
  name: string;
  weekOrders: number;
  pendingOrders: number;
  estimatedCommission: number;
  commissionPercent: number;
  daysUntilDelivery: number;
  weekDays: { label: string; date: string; done: boolean; isToday: boolean }[];
}

export default function EmployeeHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee/home")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  const hour = today.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-6">
        <p className="text-green-100 text-sm">{dateStr}</p>
        <h1 className="text-white text-2xl font-bold mt-1">
          {greeting}, {data?.name?.split(" ")[0] ?? ""}!
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Package size={18} className="text-green-600" />
              <span className="text-xs text-gray-500 font-medium">Orders This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{data?.weekOrders ?? 0}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee size={18} className="text-green-600" />
              <span className="text-xs text-gray-500 font-medium">Est. Commission</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              ₹{Math.round(data?.estimatedCommission ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-gray-400 mt-1">{data?.commissionPercent}% rate</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-orange-500" />
              <span className="text-xs text-gray-500 font-medium">Pending</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{data?.pendingOrders ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">awaiting delivery</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={18} className="text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Delivery In</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{data?.daysUntilDelivery ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">days</p>
          </div>
        </div>

        {/* Week Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Week Progress</h2>
          <div className="flex items-center justify-between">
            {data?.weekDays.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className={`text-xs font-medium ${day.isToday ? "text-green-600" : "text-gray-400"}`}>
                  {day.label}
                </span>
                {day.done ? (
                  <CheckCircle size={22} className="text-green-500" />
                ) : day.isToday ? (
                  <div className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                ) : (
                  <Circle size={22} className="text-gray-200" />
                )}
              </div>
            ))}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-blue-500">Sun</span>
              <Truck size={22} className="text-blue-400" />
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${Math.round(
                  ((data?.weekDays.filter((d) => d.done).length ?? 0) / 6) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Quick Action */}
        <a
          href="/employee/orders?new=1"
          className="block bg-green-600 text-white text-center font-semibold py-4 rounded-xl shadow-sm active:bg-green-700 transition-colors"
        >
          + New Order
        </a>
      </div>
    </div>
  );
}
