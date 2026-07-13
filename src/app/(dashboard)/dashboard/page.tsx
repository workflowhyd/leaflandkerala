import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { TopEmployees } from "@/components/dashboard/top-employees";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  ShoppingCart, Truck, Users, TrendingUp, CalendarCheck, UserPlus, Clock, Wallet, Percent,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Link from "next/link";

async function getDashboardData() {
  try {
    const session = await getSession();
    if (!session) return null;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    // Current week (Mon–Sun)
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const upcomingSunday = new Date(now);
    upcomingSunday.setDate(now.getDate() + daysUntilSunday);
    upcomingSunday.setHours(0, 0, 0, 0);
    const upcomingSundayEnd = new Date(upcomingSunday);
    upcomingSundayEnd.setHours(23, 59, 59, 999);

    const [
      [
        todayOrders,
        pendingOrders,
        weeklyOrders,
        activeEmployees,
        weeklyRevenue,
        recentOrders,
        topEmployees,
        sundayDeliveries,
        pendingRegistrations,
        weeklyOrdersByDay,
      ],
      [
        pendingPayoutEmployees,
        pendingPayoutTotal,
        paymentsThisWeek,
        totalCommissionPaid,
      ],
      commissionSummary,
    ] = await Promise.all([
      Promise.all([
        prisma.order.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: { not: "CANCELLED" } } }),
        prisma.order.count({ where: { status: { in: ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY"] } } }),
        prisma.order.count({ where: { createdAt: { gte: weekStart, lte: weekEnd }, status: { not: "CANCELLED" } } }),
        prisma.employee.count({ where: { isActive: true } }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { createdAt: { gte: weekStart, lte: weekEnd }, status: "DELIVERED" },
        }),
        prisma.order.findMany({
          take: 8,
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
        prisma.order.findMany({
          where: { deliveryDate: { gte: upcomingSunday, lte: upcomingSundayEnd }, status: { notIn: ["DELIVERED", "CANCELLED"] } },
          include: {
            customer: { select: { name: true, mobile: true, village: true } },
            employee: { select: { name: true } },
            items: { select: { quantity: true, subtotal: true } },
          },
          orderBy: { totalAmount: "desc" },
        }),
        prisma.employeeRegistrationRequest.findMany({
          where: { status: "PENDING" },
          orderBy: { submittedAt: "desc" },
          take: 5,
        }),
        prisma.$queryRaw<{ d: Date; cnt: bigint }[]>`
          SELECT DATE_TRUNC('day', "createdAt") AS d, COUNT(*) AS cnt
          FROM "Order"
          WHERE "createdAt" >= ${weekStart} AND "createdAt" <= ${weekEnd}
            AND "status" != 'CANCELLED'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY d
        `,
      ]),
      Promise.all([
        prisma.commission.findMany({
          where: { isPaid: false, order: { status: "DELIVERED" } },
          distinct: ["employeeId"],
          select: { employeeId: true },
        }),
        prisma.commission.aggregate({
          where: { isPaid: false, order: { status: "DELIVERED" } },
          _sum: { amount: true },
        }),
        prisma.employeePayment.count({
          where: { createdAt: { gte: weekStart, lte: weekEnd } },
        }),
        prisma.employeePayment.aggregate({ _sum: { amount: true } }),
      ]),
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, weeklySales: true, monthlySales: true, commissionRate: true, commissionAmount: true },
        orderBy: { monthlySales: "desc" },
        take: 10,
      }),
    ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyMap = new Map<string, number>();
    for (const row of weeklyOrdersByDay) {
      dailyMap.set(new Date(row.d).toISOString().split("T")[0], Number(row.cnt));
    }
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().split("T")[0];
      return { day: dayNames[d.getDay()], orders: dailyMap.get(key) ?? 0 };
    });

    const topEmployeesFormatted = topEmployees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      totalRevenue: emp.commissions.reduce((s: number, c: { amount: number }) => s + c.amount, 0),
      ordersCount: emp._count.orders,
      customersCount: emp._count.customers,
      commission: emp.commissions.reduce((s: number, c: { amount: number }) => s + c.amount, 0),
    }));

    return {
      todayOrders,
      pendingOrders,
      weeklyOrders,
      activeEmployees,
      weeklyRevenue: weeklyRevenue._sum.totalAmount ?? 0,
      recentOrders,
      topEmployees: topEmployeesFormatted,
      sundayDeliveries,
      upcomingSunday,
      pendingRegistrations,
      chartData,
      payoutAwaitingCount: pendingPayoutEmployees.length,
      payoutPendingTotal: pendingPayoutTotal._sum.amount ?? 0,
      paymentsThisWeek,
      totalCommissionPaid: totalCommissionPaid._sum.amount ?? 0,
      commissionSummary,
    };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const recentOrders = data?.recentOrders ?? [];
  const topEmployees = data?.topEmployees ?? [];
  const sundayDeliveries = data?.sundayDeliveries ?? [];
  const upcomingSunday: Date | undefined = data?.upcomingSunday;
  const pendingRegistrations = data?.pendingRegistrations ?? [];
  const chartData = data?.chartData ?? [];
  const commissionSummary = data?.commissionSummary ?? [];

  const sundayLabel = upcomingSunday
    ? new Date(upcomingSunday).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
    : "this Sunday";

  const stats = [
    { label: "Today's Orders", value: data?.todayOrders ?? 0, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", suffix: "" },
    { label: "Pending Orders", value: data?.pendingOrders ?? 0, icon: Truck, color: "text-orange-600", bg: "bg-orange-50", suffix: "" },
    { label: "Weekly Orders", value: data?.weeklyOrders ?? 0, icon: CalendarCheck, color: "text-[#1E4D3D]", bg: "bg-[#1E4D3D]/5", suffix: "" },
    { label: "Active Employees", value: data?.activeEmployees ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50", suffix: "" },
    { label: "Weekly Revenue", value: formatCurrency(data?.weeklyRevenue ?? 0), icon: TrendingUp, color: "text-green-700", bg: "bg-green-50", suffix: "" },
  ];

  const maxOrders = Math.max(...chartData.map((d) => d.orders), 1);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#64748b]">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {pendingRegistrations.length > 0 && (
          <Link href="/dashboard/notifications"
            className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            <UserPlus className="h-4 w-4" />
            {pendingRegistrations.length} pending approval{pendingRegistrations.length !== 1 ? "s" : ""}
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 lg:gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl bg-white border border-[#e2e8f0] p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-2`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">{value}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Payout summary cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-[#1E4D3D]" />
          <h2 className="text-sm font-semibold text-[#1a1a1a]">Employee Payouts</h2>
          <Link href="/dashboard/employees" className="ml-auto text-xs font-semibold text-[#3B7A57] hover:underline">
            Manage employees →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Awaiting Payment", value: data?.payoutAwaitingCount ?? 0, color: "text-red-600", bg: "bg-red-50", suffix: " employees" },
            { label: "Total Pending Payout", value: formatCurrency(data?.payoutPendingTotal ?? 0), color: "text-orange-600", bg: "bg-orange-50", suffix: "" },
            { label: "Payments This Week", value: data?.paymentsThisWeek ?? 0, color: "text-blue-600", bg: "bg-blue-50", suffix: "" },
            { label: "Total Commission Paid", value: formatCurrency(data?.totalCommissionPaid ?? 0), color: "text-green-700", bg: "bg-green-50", suffix: "" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-xl bg-white border border-[#e2e8f0] p-4">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-2`}>
                <Wallet className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
              <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Orders Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders This Week</CardTitle>
              <p className="mt-0.5 text-sm text-[#64748b]">Daily order count (Mon–Sun)</p>
            </div>
            <Link href="/dashboard/orders/weekly" className="text-xs font-semibold text-[#3B7A57] hover:underline">
              Weekly report →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((d) => {
              const pct = Math.round((d.orders / maxOrders) * 100);
              const isToday = d.day === ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-[#64748b]">{d.orders > 0 ? d.orders : ""}</span>
                  <div className="w-full rounded-t-md" style={{
                    height: `${Math.max(pct, d.orders > 0 ? 8 : 3)}px`,
                    maxHeight: "88px",
                    background: isToday ? "#1E4D3D" : "#3B7A57",
                    opacity: d.orders === 0 ? 0.2 : 1,
                  }} />
                  <span className={`text-[10px] font-medium ${isToday ? "text-[#1E4D3D]" : "text-[#94a3b8]"}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Registrations */}
      {pendingRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-500" />
                <div>
                  <CardTitle>Pending Approvals</CardTitle>
                  <p className="mt-0.5 text-sm text-[#64748b]">Employee registrations awaiting review</p>
                </div>
              </div>
              <Link href="/dashboard/notifications" className="text-xs font-semibold text-[#3B7A57] hover:underline">
                Review all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="divide-y divide-[#e2e8f0]">
              {pendingRegistrations.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between gap-4 px-6 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                      {reg.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#1a1a1a] truncate">{reg.fullName}</p>
                      <p className="text-xs text-[#64748b]">{reg.mobileNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sunday Deliveries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#1E4D3D]" />
              <div>
                <CardTitle>Sunday Deliveries</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">
                  {sundayLabel} — {sundayDeliveries.length} order{sundayDeliveries.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
            </div>
            <Link href="/dashboard/orders?deliveryDay=sunday" className="text-xs font-semibold text-[#3B7A57] hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {sundayDeliveries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#64748b]">No orders scheduled for this Sunday.</p>
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
                    <Link href={`/dashboard/orders/${order.id}`} className="text-xs font-medium text-[#3B7A57] hover:underline">{order.orderNumber}</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Commission Summary — read-only, auto-calculated */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-[#1E4D3D]" />
            <div>
              <CardTitle>Employee Commission Summary</CardTitle>
              <p className="mt-0.5 text-sm text-[#64748b]">Auto-calculated — view only</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {commissionSummary.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#64748b]">No active employees.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Weekly Sales</TableHead>
                  <TableHead className="text-right">Monthly Sales</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Commission Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionSummary.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(emp.weeklySales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(emp.monthlySales)}</TableCell>
                    <TableCell className="text-right">{emp.commissionRate}%</TableCell>
                    <TableCell className="text-right font-semibold text-[#1E4D3D]">{formatCurrency(emp.commissionAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent orders + Top employees */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <p className="mt-0.5 text-sm text-[#64748b]">Latest 8 orders</p>
              </div>
              <Link href="/dashboard/orders" className="text-xs font-semibold text-[#3B7A57] hover:underline">View all</Link>
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
                <p className="mt-0.5 text-sm text-[#64748b]">Ranked by commission</p>
              </div>
              <Link href="/dashboard/employees" className="text-xs font-semibold text-[#3B7A57] hover:underline">View all</Link>
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
