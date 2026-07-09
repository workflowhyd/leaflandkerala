"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Users, ShoppingCart, IndianRupee, CheckCircle, Clock, Download, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DailyBreakdown { day: string; date: string; orders: number; revenue: number; }

interface EmployeeWeek {
  id: string; name: string; commissionPercent: number;
  ordersCount: number; completedOrders: number;
  totalRevenue: number; commission: number;
  orders: {
    id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string;
    customer: { name: string; mobile: string; village: string | null };
    items: { quantity: number; product: { name: string } }[];
  }[];
}

interface WeekData {
  weekLabel: string; weekStart: string; weekEnd: string;
  summary: { totalOrders: number; totalRevenue: number; completedOrders: number; pendingOrders: number; activeEmployees: number; };
  dailyBreakdown: DailyBreakdown[];
  employees: EmployeeWeek[];
}

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-purple-100 text-purple-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  PACKED: "bg-orange-100 text-orange-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

async function downloadWeekPDF(data: WeekData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LeafLand Kerala", 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Weekly Orders Report — ${data.weekLabel}`, 20, 28);
  doc.setDrawColor(30, 77, 61);
  doc.line(20, 32, 190, 32);

  // Summary
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Weekly Summary", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Orders: ${data.summary.totalOrders}`, 20, y); y += 7;
  doc.text(`Total Revenue: ₹${data.summary.totalRevenue.toLocaleString("en-IN")}`, 20, y); y += 7;
  doc.text(`Completed: ${data.summary.completedOrders}`, 20, y); y += 7;
  doc.text(`Pending: ${data.summary.pendingOrders}`, 20, y); y += 7;
  doc.text(`Active Employees: ${data.summary.activeEmployees}`, 20, y); y += 12;

  // Per-employee breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Employee Breakdown", 20, y);
  y += 8;

  for (const emp of data.employees) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(`${emp.name} — ${emp.ordersCount} orders · ₹${emp.totalRevenue.toLocaleString("en-IN")} · Commission: ₹${Math.round(emp.commission).toLocaleString("en-IN")}`, 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const order of emp.orders) {
      if (y > 260) { doc.addPage(); y = 20; }
      // Order header line
      const orderNumText = `  ${order.orderNumber}`;
      doc.setTextColor(30, 77, 61);
      doc.text(orderNumText, 20, y);
      const customerX = 20 + doc.getTextWidth(orderNumText) + 2;
      const customerText = ` · ${order.customer.name}${order.customer.village ? ` (${order.customer.village})` : ""} · ₹${order.totalAmount.toLocaleString("en-IN")}`;
      doc.setTextColor(26, 26, 26);
      doc.text(customerText, customerX, y);
      const statusX = Math.max(155, customerX + doc.getTextWidth(customerText) + 2);
      doc.setTextColor(100, 116, 139);
      doc.text(` [${order.status.replace(/_/g, " ")}]`, statusX, y);
      y += 5;
      // Product names per order
      if (order.items && order.items.length > 0) {
        doc.setTextColor(100, 116, 139);
        const itemStr = order.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ");
        const lines = doc.splitTextToSize(`    ${itemStr}`, 165);
        for (const line of lines) {
          if (y > 275) { doc.addPage(); y = 20; doc.setTextColor(100, 116, 139); }
          doc.text(line, 20, y);
          y += 4;
        }
      }
      y += 2;
    }
    doc.setTextColor(26, 26, 26);
    y += 4;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const now = new Date().toLocaleDateString("en-IN");
  doc.text(`Generated on ${now} · LeafLand Kerala ERP`, 20, 285);

  doc.save(`Weekly_Orders_${data.weekLabel.replace(/\s+/g, "_")}.pdf`);
}

export default function WeeklyOrdersPage() {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const fetchWeek = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/weekly-orders?week=${offset}`);
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeek(weeksAgo); }, [weeksAgo, fetchWeek]);

  function navigate(delta: number) {
    const next = weeksAgo + delta;
    if (next < 0) return;
    setWeeksAgo(next);
    setExpandedEmployee(null);
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Weekly Orders</h1>
          <p className="mt-0.5 text-sm text-[#64748b]">
            {data ? data.weekLabel : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button onClick={() => downloadWeekPDF(data)}
              className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#64748b] hover:bg-[#f8f9fa]">
              <Download className="h-4 w-4" /> PDF
            </button>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-white">
            <button onClick={() => navigate(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-medium text-[#64748b] whitespace-nowrap">
              {weeksAgo === 0 ? "This Week" : weeksAgo === 1 ? "Last Week" : `${weeksAgo}w ago`}
            </span>
            <button onClick={() => navigate(-1)} disabled={weeksAgo === 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : !data ? (
        <p className="text-[#64748b]">No data available.</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "Total Orders", value: data.summary.totalOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Total Revenue", value: `₹${data.summary.totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-[#1E4D3D]", bg: "bg-[#1E4D3D]/5" },
              { label: "Completed", value: data.summary.completedOrders, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
              { label: "Pending", value: data.summary.pendingOrders, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Employees", value: data.summary.activeEmployees, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl bg-white border border-[#e2e8f0] p-4">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-2`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-[#1a1a1a]">{value}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Daily Chart */}
          <div className="rounded-xl bg-white border border-[#e2e8f0] p-4 lg:p-6">
            <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Daily Orders — {data.weekLabel}</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyBreakdown} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg bg-white border border-[#e2e8f0] p-2 shadow-sm text-xs">
                          <p className="font-semibold text-[#1a1a1a]">{label}</p>
                          <p className="text-[#64748b]">{payload[0]?.value} order{payload[0]?.value !== 1 ? "s" : ""}</p>
                          <p className="text-[#1E4D3D]">₹{Number(payload[1]?.value ?? 0).toLocaleString("en-IN")}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="orders" fill="#1E4D3D" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="#3B7A57" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-[#64748b]"><span className="h-2 w-2 rounded-full bg-[#1E4D3D]" />Orders</span>
              <span className="flex items-center gap-1.5 text-xs text-[#64748b]"><span className="h-2 w-2 rounded-full bg-[#3B7A57]" />Revenue (₹)</span>
            </div>
          </div>

          {/* Employee Breakdown */}
          <div>
            <h2 className="text-sm font-semibold text-[#1a1a1a] mb-3">Employee Breakdown</h2>
            {data.employees.length === 0 ? (
              <div className="rounded-xl bg-white border border-[#e2e8f0] p-8 text-center">
                <p className="text-[#64748b]">No orders this week.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.employees.map((emp) => {
                  const isExpanded = expandedEmployee === emp.id;
                  return (
                    <div key={emp.id} className="rounded-xl bg-white border border-[#e2e8f0] overflow-hidden">
                      <button onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                        className="w-full flex items-center justify-between gap-4 p-4 hover:bg-[#f8f9fa] text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-[#1E4D3D]/10 flex items-center justify-center text-sm font-bold text-[#1E4D3D]">
                            {emp.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1a1a1a]">{emp.name}</p>
                            <p className="text-xs text-[#64748b]">
                              {emp.ordersCount} orders · {emp.completedOrders} delivered · {emp.commissionPercent}% commission
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right hidden md:block">
                            <p className="font-semibold text-[#1a1a1a]">₹{emp.totalRevenue.toLocaleString("en-IN")}</p>
                            <p className="text-xs text-green-700">+₹{Math.round(emp.commission).toLocaleString("en-IN")} comm.</p>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-[#94a3b8] flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#e2e8f0] px-4 py-3">
                          {/* Mobile revenue row */}
                          <div className="flex gap-4 mb-3 md:hidden">
                            <div><p className="text-xs text-[#64748b]">Revenue</p><p className="font-semibold text-[#1a1a1a]">₹{emp.totalRevenue.toLocaleString("en-IN")}</p></div>
                            <div><p className="text-xs text-[#64748b]">Commission</p><p className="font-semibold text-green-700">₹{Math.round(emp.commission).toLocaleString("en-IN")}</p></div>
                          </div>
                          <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Orders ({emp.orders.length})</p>
                          <div className="space-y-2">
                            {emp.orders.map((order) => (
                              <div key={order.id} className="flex items-start justify-between gap-3 rounded-lg bg-[#f8f9fa] px-3 py-2.5">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <a href={`/dashboard/orders/${order.id}`}
                                      className="text-sm font-medium text-[#1E4D3D] hover:underline">{order.orderNumber}</a>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                                      {order.status.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#64748b] mt-0.5">{order.customer.name}{order.customer.village ? ` · ${order.customer.village}` : ""}</p>
                                  <p className="text-xs text-[#94a3b8]">{order.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}</p>
                                </div>
                                <p className="font-semibold text-[#1a1a1a] text-sm flex-shrink-0">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
