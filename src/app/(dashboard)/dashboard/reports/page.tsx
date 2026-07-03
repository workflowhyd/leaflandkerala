"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, FileText, BarChart2, Users, TrendingUp, UserCheck, GitMerge, Undo2, Package } from "lucide-react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";

type TabId = "sales" | "products" | "customers" | "employees" | "conversions" | "returns";

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "sales", label: "Sales Report", icon: BarChart2 },
  { id: "products", label: "Product Performance", icon: TrendingUp },
  { id: "customers", label: "Customer Growth", icon: Users },
  { id: "employees", label: "Employee Performance", icon: UserCheck },
  { id: "conversions", label: "Visit Conversion", icon: GitMerge },
  { id: "returns", label: "Returns Report", icon: Undo2 },
];

interface SalesData {
  label: string;
  amount: number;
  orders: number;
}

interface ProductData {
  name: string;
  category: string;
  salesCount: number;
  revenue: number;
}

interface CustomerGrowthData {
  label: string;
  count: number;
}

interface EmployeeData {
  name: string;
  customers: number;
  orders: number;
  visits: number;
  revenue: number;
  commission: number;
}

interface ConversionData {
  employeeName: string;
  customerName: string;
  visitDate: string;
  orderNumber?: string;
  orderDate?: string;
  converted: boolean;
}

interface ReturnsReportData {
  totalReturns: number;
  totalOrders: number;
  returnRate: number;
  mostReturnedProducts: { name: string; quantity: number }[];
  reasonBreakdown: { reason: string; count: number }[];
  employeeBreakdown: { name: string; count: number }[];
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("sales");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");

  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowthData[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [returnsData, setReturnsData] = useState<ReturnsReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSalesData = useCallback(async () => {
    const res = await fetch(`/api/orders?limit=1000`);
    if (!res.ok) return;
    const data = await res.json();
    const orders = data.orders.filter((o: { createdAt: string; status: string }) => {
      const d = new Date(o.createdAt);
      return d >= new Date(dateFrom) && d <= new Date(dateTo + "T23:59:59") && o.status !== "CANCELLED";
    });

    const grouped: Record<string, { amount: number; orders: number }> = {};
    orders.forEach((o: { createdAt: string; totalAmount: number }) => {
      const d = new Date(o.createdAt);
      let key = "";
      if (granularity === "daily") key = d.toISOString().slice(0, 10);
      else if (granularity === "weekly") {
        const week = Math.ceil(d.getDate() / 7);
        key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
      } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { amount: 0, orders: 0 };
      grouped[key].amount += o.totalAmount;
      grouped[key].orders += 1;
    });

    setSalesData(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, v]) => ({ label, amount: v.amount, orders: v.orders }))
    );
  }, [dateFrom, dateTo, granularity]);

  const fetchProductData = useCallback(async () => {
    const ordersRes = await fetch(`/api/orders?limit=1000`);
    if (!ordersRes.ok) return;
    const ordersData = await ordersRes.json();
    const productMap: Record<string, ProductData> = {};
    ordersData.orders
      .filter((o: { status: string }) => o.status !== "CANCELLED")
      .forEach((o: { items: { product: { id: string; name: string; category?: string }; quantity: number; subtotal: number }[] }) => {
        o.items?.forEach((item) => {
          const pid = item.product.id;
          if (!productMap[pid]) {
            productMap[pid] = { name: item.product.name, category: item.product.category || "", salesCount: 0, revenue: 0 };
          }
          productMap[pid].salesCount += item.quantity;
          productMap[pid].revenue += item.subtotal;
        });
      });
    setProductData(Object.values(productMap).sort((a, b) => b.revenue - a.revenue));
  }, []);

  const fetchCustomerGrowth = useCallback(async () => {
    const res = await fetch("/api/customers?limit=1000");
    if (!res.ok) return;
    const data = await res.json();
    const grouped: Record<string, number> = {};
    data.customers.forEach((c: { createdAt: string }) => {
      const key = new Date(c.createdAt).toISOString().slice(0, 7);
      grouped[key] = (grouped[key] || 0) + 1;
    });
    setCustomerGrowth(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, count]) => ({ label, count }))
    );
  }, []);

  const fetchEmployeeData = useCallback(async () => {
    const res = await fetch("/api/employees?limit=100");
    if (!res.ok) return;
    const data = await res.json();
    const employees = data.employees || [];

    const ordersRes = await fetch("/api/orders?limit=1000");
    const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };

    const visitsRes = await fetch("/api/field-visits?limit=1000");
    void (visitsRes.ok ? visitsRes.json() : { visits: [] });

    const result: EmployeeData[] = employees.map((emp: {
      id: string;
      name: string;
      _count: { customers: number; orders: number; fieldVisits: number };
      commissions: { amount: number }[];
    }) => {
      const empOrders = ordersData.orders.filter((o: { employeeId: string; status: string; totalAmount: number }) =>
        o.employeeId === emp.id && o.status !== "CANCELLED"
      );
      const revenue = empOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0);
      const commission = emp.commissions?.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0) || 0;
      return {
        name: emp.name,
        customers: emp._count.customers,
        orders: emp._count.orders,
        visits: emp._count.fieldVisits,
        revenue,
        commission,
      };
    });
    setEmployeeData(result.sort((a, b) => b.revenue - a.revenue));
  }, []);

  const fetchConversionData = useCallback(async () => {
    const visitsRes = await fetch("/api/field-visits?limit=1000");
    if (!visitsRes.ok) return;
    const visitsData = await visitsRes.json();

    const ordersRes = await fetch("/api/orders?limit=1000");
    if (!ordersRes.ok) return;
    const ordersData = await ordersRes.json();

    const ordersByCustomer: Record<string, { orderNumber: string; createdAt: string }> = {};
    ordersData.orders.forEach((o: { customerId: string; orderNumber: string; createdAt: string; status: string }) => {
      if (o.status !== "CANCELLED") {
        ordersByCustomer[o.customerId] = { orderNumber: o.orderNumber, createdAt: o.createdAt };
      }
    });

    const result: ConversionData[] = visitsData.visits.map((v: {
      visitDate: string;
      employee: { name: string };
      customer: { id: string; name: string };
    }) => {
      const order = ordersByCustomer[v.customer.id];
      return {
        employeeName: v.employee.name,
        customerName: v.customer.name,
        visitDate: v.visitDate,
        orderNumber: order?.orderNumber,
        orderDate: order?.createdAt,
        converted: !!order,
      };
    });
    setConversionData(result);
  }, []);

  const fetchReturnsData = useCallback(async () => {
    const [returnsRes, ordersRes] = await Promise.all([
      fetch("/api/returns?limit=1000"),
      fetch("/api/orders?limit=1"),
    ]);
    if (!returnsRes.ok) return;
    const returnsData = await returnsRes.json();
    const totalOrders = ordersRes.ok ? (await ordersRes.json()).total ?? 0 : 0;

    const returns: {
      status: string;
      reason: string;
      employee: { name: string };
      items: { quantity: number; product: { name: string } }[];
    }[] = returnsData.returns;

    const productMap: Record<string, number> = {};
    const reasonMap: Record<string, number> = {};
    const employeeMap: Record<string, number> = {};

    returns.forEach((r) => {
      reasonMap[r.reason] = (reasonMap[r.reason] || 0) + 1;
      employeeMap[r.employee.name] = (employeeMap[r.employee.name] || 0) + 1;
      r.items.forEach((item) => {
        productMap[item.product.name] = (productMap[item.product.name] || 0) + item.quantity;
      });
    });

    setReturnsData({
      totalReturns: returnsData.total,
      totalOrders,
      returnRate: totalOrders > 0 ? (returnsData.total / totalOrders) * 100 : 0,
      mostReturnedProducts: Object.entries(productMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
      reasonBreakdown: Object.entries(reasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      employeeBreakdown: Object.entries(employeeMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetchers: Record<TabId, () => Promise<void>> = {
      sales: fetchSalesData,
      products: fetchProductData,
      customers: fetchCustomerGrowth,
      employees: fetchEmployeeData,
      conversions: fetchConversionData,
      returns: fetchReturnsData,
    };
    fetchers[activeTab]().finally(() => setLoading(false));
  }, [activeTab, fetchSalesData, fetchProductData, fetchCustomerGrowth, fetchEmployeeData, fetchConversionData, fetchReturnsData]);

  const exportExcel = () => {
    let rows: Record<string, unknown>[] = [];
    let sheetName = "";
    if (activeTab === "sales") {
      rows = salesData.map((d) => ({ Period: d.label, Orders: d.orders, "Revenue (₹)": d.amount }));
      sheetName = "Sales";
    } else if (activeTab === "products") {
      rows = productData.map((d) => ({ Product: d.name, Category: d.category, "Units Sold": d.salesCount, "Revenue (₹)": d.revenue }));
      sheetName = "Products";
    } else if (activeTab === "customers") {
      rows = customerGrowth.map((d) => ({ Month: d.label, "New Customers": d.count }));
      sheetName = "CustomerGrowth";
    } else if (activeTab === "employees") {
      rows = employeeData.map((d) => ({ Employee: d.name, Customers: d.customers, Orders: d.orders, Visits: d.visits, "Revenue (₹)": d.revenue, "Commission (₹)": d.commission }));
      sheetName = "Employees";
    } else if (activeTab === "conversions") {
      rows = conversionData.map((d) => ({ Employee: d.employeeName, Customer: d.customerName, "Visit Date": formatDate(d.visitDate), "Order #": d.orderNumber || "", "Order Date": d.orderDate ? formatDate(d.orderDate) : "", Converted: d.converted ? "Yes" : "No" }));
      sheetName = "Conversions";
    } else if (activeTab === "returns" && returnsData) {
      rows = returnsData.mostReturnedProducts.map((d) => ({ Product: d.name, "Units Returned": d.quantity }));
      sheetName = "Returns";
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.toLowerCase()}-report.xlsx`);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFillColor(30, 77, 61);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(248, 245, 238);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LeafLand Kerala — Report", 14, 18);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const tabLabel = TABS.find((t) => t.id === activeTab)?.label || "";
    doc.text(`Report: ${tabLabel}`, 14, 40);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 47);

    let y = 60;
    const pageWidth = 190;

    if (activeTab === "sales" && salesData.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setFillColor(30, 77, 61);
      doc.rect(14, y, pageWidth, 7, "F");
      doc.setTextColor(248, 245, 238);
      doc.text("Period", 16, y + 5);
      doc.text("Orders", 100, y + 5);
      doc.text("Revenue (₹)", 150, y + 5);
      y += 9;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(26, 26, 26);
      salesData.forEach((d, i) => {
        if (i % 2 === 0) { doc.setFillColor(248, 245, 238); doc.rect(14, y, pageWidth, 7, "F"); }
        doc.text(d.label, 16, y + 5);
        doc.text(String(d.orders), 100, y + 5);
        doc.text(formatCurrency(d.amount), 150, y + 5);
        y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    doc.save(`${activeTab}-report.pdf`);
  };

  const conversionRate = conversionData.length
    ? ((conversionData.filter((d) => d.converted).length / conversionData.length) * 100).toFixed(1)
    : "0";

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Reports</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Analytics and business insights</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-white p-1 w-fit min-w-full sm:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-[#1E4D3D] text-white" : "text-[#64748b] hover:text-[#1a1a1a] hover:bg-[#f8f9fa]"}`}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#64748b]">Loading report...</div>
      ) : (
        <>
          {activeTab === "sales" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#64748b]">From:</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#64748b]">To:</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]" />
                </div>
                <div className="flex rounded-md border border-[#e2e8f0] overflow-hidden">
                  {(["daily", "weekly", "monthly"] as const).map((g) => (
                    <button key={g} onClick={() => setGranularity(g)} className={`px-3 py-1.5 text-sm capitalize ${granularity === g ? "bg-[#1E4D3D] text-white" : "bg-white text-[#64748b] hover:bg-[#f8f9fa]"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <Card>
                <CardHeader><CardTitle>Sales Revenue</CardTitle></CardHeader>
                <CardContent>
                  {salesData.length === 0 ? (
                    <p className="text-[#64748b] text-sm">No data for this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: unknown) => [formatCurrency(Number(v)), "Revenue"]} />
                        <Bar dataKey="amount" fill="#1E4D3D" radius={[4, 4, 0, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "products" && (
            <Card>
              <CardHeader><CardTitle>Product Performance</CardTitle></CardHeader>
              <CardContent className="!px-0 !pb-0">
                {productData.length === 0 ? (
                  <p className="px-6 pb-6 text-[#64748b] text-sm">No product data available.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productData.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-[#64748b]">{p.category}</TableCell>
                          <TableCell className="text-right">{p.salesCount}</TableCell>
                          <TableCell className="text-right font-semibold text-[#1E4D3D]">{formatCurrency(p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "customers" && (
            <Card>
              <CardHeader><CardTitle>Customer Growth Over Time</CardTitle></CardHeader>
              <CardContent>
                {customerGrowth.length === 0 ? (
                  <p className="text-[#64748b] text-sm">No data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={customerGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B7A57" strokeWidth={2} dot={{ fill: "#1E4D3D", r: 4 }} name="New Customers" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "employees" && (
            <Card>
              <CardHeader><CardTitle>Employee Performance</CardTitle></CardHeader>
              <CardContent className="!px-0 !pb-0">
                {employeeData.length === 0 ? (
                  <p className="px-6 pb-6 text-[#64748b] text-sm">No employees found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Customers</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Visits</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeData.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="text-right">{e.customers}</TableCell>
                          <TableCell className="text-right">{e.orders}</TableCell>
                          <TableCell className="text-right">{e.visits}</TableCell>
                          <TableCell className="text-right font-semibold text-[#1E4D3D]">{formatCurrency(e.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(e.commission)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "conversions" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Card className="p-4 flex items-center gap-3">
                  <GitMerge className="h-6 w-6 text-[#3B7A57]" />
                  <div>
                    <p className="text-xs text-[#64748b]">Conversion Rate</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{conversionRate}%</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <Users className="h-6 w-6 text-[#3B7A57]" />
                  <div>
                    <p className="text-xs text-[#64748b]">Total Visits</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{conversionData.length}</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-[#3B7A57]" />
                  <div>
                    <p className="text-xs text-[#64748b]">Converted</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{conversionData.filter((d) => d.converted).length}</p>
                  </div>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Visit Conversion Details</CardTitle></CardHeader>
                <CardContent className="!px-0 !pb-0">
                  {conversionData.length === 0 ? (
                    <p className="px-6 pb-6 text-[#64748b] text-sm">No visit data available.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Visit Date</TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conversionData.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell>{d.employeeName}</TableCell>
                            <TableCell className="font-medium">{d.customerName}</TableCell>
                            <TableCell>{formatDate(d.visitDate)}</TableCell>
                            <TableCell>{d.orderNumber || "—"}</TableCell>
                            <TableCell>{d.orderDate ? formatDate(d.orderDate) : "—"}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${d.converted ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                {d.converted ? "Converted" : "Pending"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "returns" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Card className="p-4 flex items-center gap-3">
                  <Undo2 className="h-6 w-6 text-[#3B7A57]" />
                  <div>
                    <p className="text-xs text-[#64748b]">Total Returns</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{returnsData?.totalReturns ?? 0}</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <BarChart2 className="h-6 w-6 text-[#3B7A57]" />
                  <div>
                    <p className="text-xs text-[#64748b]">Return Rate</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{(returnsData?.returnRate ?? 0).toFixed(1)}%</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <Package className="h-6 w-6 text-[#3B7A57]" />
                  <div>
                    <p className="text-xs text-[#64748b]">Total Orders</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{returnsData?.totalOrders ?? 0}</p>
                  </div>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Most Returned Products</CardTitle></CardHeader>
                <CardContent>
                  {!returnsData || returnsData.mostReturnedProducts.length === 0 ? (
                    <p className="text-[#64748b] text-sm">No returns recorded yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={returnsData.mostReturnedProducts} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#1E4D3D" radius={[0, 4, 4, 0]} name="Units Returned" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Return Reasons</CardTitle></CardHeader>
                  <CardContent className="!px-0 !pb-0">
                    {!returnsData || returnsData.reasonBreakdown.length === 0 ? (
                      <p className="px-6 pb-6 text-[#64748b] text-sm">No data available.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnsData.reasonBreakdown.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{getStatusLabel(r.reason)}</TableCell>
                              <TableCell className="text-right">{r.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Employee-wise Returns</CardTitle></CardHeader>
                  <CardContent className="!px-0 !pb-0">
                    {!returnsData || returnsData.employeeBreakdown.length === 0 ? (
                      <p className="px-6 pb-6 text-[#64748b] text-sm">No data available.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-right">Returns</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnsData.employeeBreakdown.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell className="text-right">{e.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
