import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalRevenue,
    lastMonthRevenue,
    totalOrders,
    pendingOrders,
    activeCustomers,
    lowStockProducts,
    recentOrders,
    topEmployees,
    monthlyRevenue,
    ordersByStatus,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: "DELIVERED" },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: "DELIVERED",
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    prisma.order.count(),
    prisma.order.count({
      where: { status: { in: ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY"] } },
    }),
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
        orders: { select: { id: true } },
        customers: { select: { id: true } },
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
    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const thisMonthRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      status: "DELIVERED",
      createdAt: { gte: startOfMonth },
    },
  });

  const revenueChange = lastMonthRevenue._sum.totalAmount
    ? (((thisMonthRevenue._sum.totalAmount || 0) - lastMonthRevenue._sum.totalAmount) /
        lastMonthRevenue._sum.totalAmount) *
      100
    : 0;

  const topEmployeesFormatted = topEmployees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    totalRevenue: emp.commissions.reduce((sum, c) => sum + c.amount, 0),
    ordersCount: emp.orders.length,
    customersCount: emp.customers.length,
    commission: emp.commissions.reduce((sum, c) => sum + c.amount, 0),
  }));

  return NextResponse.json({
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
  });
}
