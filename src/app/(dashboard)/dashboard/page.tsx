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
  CalendarCheck,
  Trophy,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function getDashboardData() {
  try {
    const session = await getSession();
    if (!session) return null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const upcomingSunday = new Date(now);
    upcomingSunday.setDate(now.getDate() + daysUntilSunday);
    upcomingSunday.setHours(0, 0, 0, 0);
    const upcomingSundayEnd = new Date(upcomingSunday);
    upcomingSundayEnd.setHours(23, 59, 59, 999);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sixMonthsFromThirty = new Date(thirtyDaysFromNow);
    sixMonthsFromThirty.setMonth(sixMonthsFromThirty.getMonth() - 6);

    const [
      totalRevenue,
      lastMonthRevenue,
      thisMonthRevenue,
      totalOrders,
      pendingOrders,
      activeCustomers,
      lowStockProducts,
      recentOrders,
      topEmployees,
      monthlyRevenue,
      ordersByStatus,
      sundayDeliveries,
      eligibleCount,
      upcomingAnniversaries,
      activeOffersCount,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: "DELIVERED" } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: "DELIVERED", createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: "DELIVERED", createdAt: { gte: startOfMonth } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY"] } } }),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.product.count({ where: { stock: { lt: 10 }, isActive: true } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, mobile: true } },
          employee: { select: { name: true } },
        },
      }),
      prisma.employee.findMany({
        take: 5,
        include: {
          commissions: { select: { amount: true } },
          _count: { select: { orders: true, customers: true } },
        },
      }),
      prisma.$queryRaw<{ month: string; revenue: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
               SUM("totalAmount") as revenue
        FROM "Order"
        WHERE "status" = 'DELIVERED'
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt")
      `,
      prisma.order.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.order.findMany({
        where: { deliveryDate: { gte: upcomingSunday, lte: upcomingSundayEnd }, status: { notIn: ["DELIVERED", "CANCELLED"] } },
        include: {
          customer: { select: { name: true, mobile: true, village: true } },
          employee: { select: { name: true } },
          items: { select: { quantity: true, subtotal: true } },
        },
        orderBy: { totalAmount: "desc" },
      }),
      prisma.employee.count({ where: { createdAt: { lte: sixMonthsAgo }, isActive: true } }),
      prisma.employee.findMany({
        where: { isActive: true, createdAt: { gte: sixMonthsFromThirty, lte: sixMonthsAgo } },
        select: { id: true, name: true, createdAt: true },
        take: 5,
      }),
      prisma.offer.count({ where: { isActive: true } }),
    ]);

    const revenueChange = lastMonthRevenue._sum.totalAmount
      ? (((thisMonthRevenue._sum.totalAmount || 0) - lastMonthRevenue._sum.totalAmount) / lastMonthRevenue._sum.totalAmount) * 100
      : 0;

    const topEmployeesFormatted = topEmployees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      totalRevenue: emp.commissions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
      ordersCount: emp._count.orders,
      customersCount: emp._count.customers,
      commission: emp.commissions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
    }));

    const upcomingAnniversariesFormatted = upcomingAnniversaries.map((emp) => {
      const joinDate = new Date(emp.createdAt);
      const sixMonthMark = new Date(joinDate);
      sixMonthMark.setMonth(sixMonthMark.getMonth() + 6);
      const daysUntil = Math.ceil((sixMonthMark.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { id: emp.id, name: emp.name, daysUntil };
    });

    return {
      stats: {
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        revenueChange: revenueChange.toFixed(1),
        totalOrders,
        pendingOrders,
        activeCustomers,
        lowStockProducts,
      },
      recentOrders,
      topEmployees: topEmployeesFormatted,
      monthlyRevenue,
      ordersByStatus,
      sundayDeliveries,
      upcomingSunday,
      rewards: {
        eligibleCount,
        upcomingAnniversaries: upcomingAnniversariesFormatted,
        activeOffersCount,
      },
    };
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

  const sundayDeliveries = data?.sundayDeliveries ?? [];
  const upcomingSunday: Date | undefined = data?.upcomingSunday;

  const rewards = data?.rewards ?? { eligibleCount: 0, upcomingAnniversaries: [], activeOffersCount: 0 };
  const upcomingAnniversaries: { id: string; name: string; daysUntil: number }[] = rewards.upcomingAnniversaries ?? [];
  const sundayLabel = upcomingSunday
    ? new Date(upcomingSunday).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
    : "this Sunday";

  const revenueChange = parseFloat(stats.revenueChange);
  const revenueChangeType =
    revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "neutral";

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#64748b]">
          Welcome back! Here&apos;s what&apos;s happening with LeafLand Kerala.
        </p>
      </div>

      {/* Stat cards — 2 cols on mobile, 3 on md, 6 on xl */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 lg:gap-4">
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
          title="Pending"
          value={stats.pendingOrders.toLocaleString("en-IN")}
          icon={Truck}
          color="#F9A825"
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockProducts.toLocaleString("en-IN")}
          icon={AlertTriangle}
          color="#D32F2F"
        />
        <StatCard
          title="Customers"
          value={stats.activeCustomers.toLocaleString("en-IN")}
          icon={Users}
          color="#2E7D32"
        />
        <StatCard
          title="Monthly Rev."
          value={formatCurrency(
            monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0
          )}
          icon={TrendingUp}
          change={`${Math.abs(revenueChange).toFixed(1)}%`}
          changeType={revenueChangeType}
          color="#3B7A57"
        />
      </div>

      {/* Charts row — stack on mobile, side-by-side on lg */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
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

      {/* Upcoming Sunday Deliveries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#1E4D3D]" />
              <div>
                <CardTitle>Upcoming Sunday Deliveries</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">{sundayLabel} — {sundayDeliveries.length} order{sundayDeliveries.length !== 1 ? "s" : ""} scheduled</p>
              </div>
            </div>
            <a href="/dashboard/orders?deliveryDay=sunday" className="text-xs font-semibold text-[#3B7A57] hover:underline">View all</a>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {sundayDeliveries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#64748b]">No orders scheduled for delivery this Sunday.</p>
          ) : (
            <div className="divide-y divide-[#e2e8f0]">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {sundayDeliveries.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between gap-4 px-6 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1a1a1a] truncate">{order.customer.name}</p>
                    <p className="text-xs text-[#64748b]">
                      {order.customer.village ? `${order.customer.village} · ` : ""}{order.employee.name} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-semibold text-[#1E4D3D]">₹{order.totalAmount.toLocaleString("en-IN")}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      order.status === "PACKED" ? "bg-blue-100 text-blue-700" :
                      order.status === "OUT_FOR_DELIVERY" ? "bg-green-100 text-green-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{order.status.replace(/_/g, " ")}</span>
                    <a href={`/dashboard/orders/${order.id}`} className="text-xs font-medium text-[#3B7A57] hover:underline">{order.orderNumber}</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Rewards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle>Employee Rewards</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">6-month bonus eligibility &amp; active campaigns</p>
              </div>
            </div>
            <a href="/dashboard/settings?tab=offers" className="text-xs font-semibold text-[#3B7A57] hover:underline">Manage offers</a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-amber-700">{rewards.eligibleCount}</p>
                <p className="text-xs text-amber-600">eligible for 6-Month Bonus</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#1E4D3D]/5 border border-[#1E4D3D]/10 px-4 py-3 flex items-center gap-3">
              <span className="text-xl">🎁</span>
              <div>
                <p className="text-xl font-bold text-[#1E4D3D]">{rewards.activeOffersCount}</p>
                <p className="text-xs text-[#1E4D3D]/70">active reward campaigns</p>
              </div>
            </div>
          </div>
          {upcomingAnniversaries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Upcoming 6-Month Anniversaries</p>
              <div className="flex flex-col gap-1">
                {upcomingAnniversaries.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-sm py-1.5 border-b border-[#f1f5f9] last:border-0">
                    <span className="font-medium text-[#1a1a1a]">{emp.name}</span>
                    <span className="text-xs text-amber-600 font-medium">
                      {emp.daysUntil <= 0 ? "Today!" : `${emp.daysUntil} day${emp.daysUntil !== 1 ? "s" : ""} until 6-month mark`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {upcomingAnniversaries.length === 0 && (
            <p className="text-sm text-[#64748b]">No upcoming 6-month anniversaries in the next 30 days.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent orders + Top employees — stack on mobile, 5-col grid on lg */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
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
