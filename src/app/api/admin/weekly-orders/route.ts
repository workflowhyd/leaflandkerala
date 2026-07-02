import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getWeekBounds(weeksAgo: number) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMon - weeksAgo * 7);
  thisMonday.setHours(0, 0, 0, 0);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);
  return { start: thisMonday, end: thisSunday };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const weeksAgo = parseInt(new URL(request.url).searchParams.get("week") ?? "0", 10);
  const { start, end } = getWeekBounds(weeksAgo);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [orders, employeesRaw] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      include: {
        customer: { select: { name: true, mobile: true, village: true } },
        employee: { select: { id: true, name: true, commissionPercent: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, commissionPercent: true },
    }),
  ]);

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const completedOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const pendingOrders = orders.filter((o) => o.status !== "DELIVERED").length;
  const activeEmployeeIds = new Set(orders.map((o) => o.employeeId));

  // Daily breakdown (Mon–Sun)
  const dailyMap: Record<string, { orders: number; revenue: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = { orders: 0, revenue: 0 };
  }
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().split("T")[0];
    if (dailyMap[key]) {
      dailyMap[key].orders++;
      dailyMap[key].revenue += o.totalAmount;
    }
  }
  const dailyBreakdown = Object.entries(dailyMap).map(([date, val]) => ({
    day: dayNames[new Date(date).getDay()],
    date,
    orders: val.orders,
    revenue: val.revenue,
  }));

  // Per-employee breakdown
  const employeeMap = new Map<string, {
    id: string; name: string; commissionPercent: number;
    ordersCount: number; completedOrders: number;
    totalRevenue: number; commission: number;
    orders: typeof orders;
  }>();
  for (const emp of employeesRaw) {
    if (activeEmployeeIds.has(emp.id)) {
      employeeMap.set(emp.id, {
        id: emp.id, name: emp.name, commissionPercent: emp.commissionPercent,
        ordersCount: 0, completedOrders: 0, totalRevenue: 0, commission: 0,
        orders: [],
      });
    }
  }
  for (const o of orders) {
    const entry = employeeMap.get(o.employeeId ?? "");
    if (!entry) continue;
    entry.ordersCount++;
    entry.totalRevenue += o.totalAmount;
    if (o.status === "DELIVERED") entry.completedOrders++;
    entry.commission += (o.totalAmount * entry.commissionPercent) / 100;
    entry.orders.push(o);
  }

  const employees = [...employeeMap.values()].sort((a, b) => b.totalRevenue - a.totalRevenue);

  const weekLabel = `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  return NextResponse.json({
    weekLabel,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    summary: {
      totalOrders: orders.length,
      totalRevenue,
      completedOrders,
      pendingOrders,
      activeEmployees: activeEmployeeIds.size,
    },
    dailyBreakdown,
    employees,
  });
}
