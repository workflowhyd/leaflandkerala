import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OrdersChart } from "@/components/dashboard/orders-chart";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { TopEmployees } from "@/components/dashboard/top-employees";
import {
  DollarSign,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Users,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cookies } from "next/headers";

async function getDashboardData() {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/dashboard`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const stats = data?.stats ?? {
    totalRevenue: 0,
    revenueChange: "0",
    totalOrders: 0,
    pendingOrders: 0,
    activeCustomers: 0,
    lowStockProducts: 0,
  };

  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const ordersByStatus = data?.ordersByStatus ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const topEmployees = data?.topEmployees ?? [];

  const revenueChange = parseFloat(stats.revenueChange);
  const revenueChangeType =
    revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "neutral";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Welcome back! Here&apos;s what&apos;s happening with LeafLand Kerala.
        </p>
      </div>

      {/* Stat cards — 6 columns on xl, 3 on md, 2 on sm */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          change={`${Math.abs(revenueChange).toFixed(1)}%`}
          changeType={revenueChangeType}
          color="#1E4D3D"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString("en-IN")}
          icon={ShoppingCart}
          color="#3B7A57"
        />
        <StatCard
          title="Pending Deliveries"
          value={stats.pendingOrders.toLocaleString("en-IN")}
          icon={Truck}
          color="#F9A825"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockProducts.toLocaleString("en-IN")}
          icon={AlertTriangle}
          color="#D32F2F"
        />
        <StatCard
          title="Active Customers"
          value={stats.activeCustomers.toLocaleString("en-IN")}
          icon={Users}
          color="#2E7D32"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(
            monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0
          )}
          icon={TrendingUp}
          change={`${Math.abs(revenueChange).toFixed(1)}%`}
          changeType={revenueChangeType}
          color="#3B7A57"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">Last 6 months delivered revenue</p>
              </div>
              <span className="rounded-lg bg-[#1E4D3D]/10 px-3 py-1 text-xs font-semibold text-[#1E4D3D]">
                Revenue
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthlyRevenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Orders by Status</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">Distribution across all order statuses</p>
              </div>
              <span className="rounded-lg bg-[#3B7A57]/10 px-3 py-1 text-xs font-semibold text-[#3B7A57]">
                Orders
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <OrdersChart data={ordersByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + Top employees */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Orders — takes 3/5 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">Latest 10 orders across all employees</p>
              </div>
              <a
                href="/dashboard/orders"
                className="text-xs font-semibold text-[#3B7A57] hover:underline"
              >
                View all
              </a>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <RecentOrdersTable orders={recentOrders} />
          </CardContent>
        </Card>

        {/* Top Employees — takes 2/5 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Employees</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">Ranked by total revenue</p>
              </div>
              <a
                href="/dashboard/employees"
                className="text-xs font-semibold text-[#3B7A57] hover:underline"
              >
                View all
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <TopEmployees employees={topEmployees} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
