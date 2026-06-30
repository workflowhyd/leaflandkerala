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
    totalOrders,
    pendingOrders,
    activeCustomers,
    lowStockProducts,
    recentOrders,
    topEmployees,
    monthlyRevenue,
    ordersByStatus,
    sundayDeliveries,
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
    prisma.order.findMany({
      where: {
        deliveryDate: { gte: upcomingSunday, lte: upcomingSundayEnd },
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
      include: {
        customer: { select: { name: true, mobile: true, village: true } },
        employee: { select: { name: true } },
        items: { select: { quantity: true, subtotal: true } },
      },
      orderBy: { totalAmount: "desc" },
    }),
  ]);

  const [eligibleCount, upcomingAnniversaries, activeOffersCount] = await Promise.all([
    prisma.employee.count({
      where: { createdAt: { lte: sixMonthsAgo }, isActive: true },
    }),
    prisma.employee.findMany({
      where: {
        isActive: true,
        createdAt: { gte: sixMonthsFromThirty, lte: sixMonthsAgo },
      },
      select: { id: true, name: true, createdAt: true },
      take: 5,
    }),
    prisma.offer.count({ where: { isActive: true } }),
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
    totalRevenue: emp.commissions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
    ordersCount: emp.orders.length,
    customersCount: emp.customers.length,
    commission: emp.commissions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
  }));

  const upcomingAnniversariesFormatted = upcomingAnniversaries.map((emp) => {
    const joinDate = new Date(emp.createdAt);
    const sixMonthMark = new Date(joinDate);
    sixMonthMark.setMonth(sixMonthMark.getMonth() + 6);
    const daysUntil = Math.ceil((sixMonthMark.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { id: emp.id, name: emp.name, daysUntil };
  });

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
    sundayDeliveries,
    upcomingSunday,
    rewards: {
      eligibleCount,
      upcomingAnniversaries: upcomingAnniversariesFormatted,
      activeOffersCount,
    },
  });
}
