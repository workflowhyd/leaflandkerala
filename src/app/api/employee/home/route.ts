import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeeklyCommission } from "@/lib/commission";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  sat.setHours(23, 59, 59, 999);
  return { weekStart: mon, weekEnd: sat };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { weekStart, weekEnd } = getWeekRange();

  const [weekOrders, pendingOrders, totalCommission, weeklyInfo, availableEarningsAgg, lastPayment] = await Promise.all([
    prisma.order.count({
      where: {
        employeeId: employee.id,
        createdAt: { gte: weekStart, lte: weekEnd },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.order.count({
      where: {
        employeeId: employee.id,
        createdAt: { gte: weekStart, lte: weekEnd },
        status: { in: ["NEW", "CONFIRMED", "PROCESSING"] },
      },
    }),
    prisma.commission.aggregate({
      where: { employeeId: employee.id },
      _sum: { amount: true },
    }),
    getWeeklyCommission(employee.id, weekStart, weekEnd),
    prisma.commission.aggregate({
      where: {
        employeeId: employee.id,
        isPaid: false,
        order: { status: "DELIVERED" },
      },
      _sum: { amount: true },
    }),
    prisma.employeePayment.findFirst({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, amount: true, referenceNumber: true },
    }),
  ]);

  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      label: dayNames[d.getDay()],
      date: d.toISOString().split("T")[0],
      done: d < today,
      isToday: d.toDateString() === today.toDateString(),
    };
  });

  const nextSunday = new Date(weekStart);
  nextSunday.setDate(weekStart.getDate() + 6);
  const daysUntilDelivery = Math.max(
    0,
    Math.ceil((nextSunday.getTime() - today.getTime()) / 86400000)
  );

  return NextResponse.json({
    name: session.name,
    weekOrders,
    pendingOrders,
    estimatedCommission: weeklyInfo.weeklyCommission,
    totalEarnings: totalCommission._sum.amount ?? 0,
    commissionPercent: employee.commissionPercent,
    daysUntilDelivery,
    weekDays,
    weeklySales: weeklyInfo.weeklySales,
    weeklyOrdersDelivered: weeklyInfo.weeklyOrdersDelivered,
    weeklyCommission: weeklyInfo.weeklyCommission,
    weeklyCommissionRate: weeklyInfo.commissionRate,
    isEligibleForBonus: weeklyInfo.isEligible,
    bonusThreshold: weeklyInfo.threshold,
    bonusRate: weeklyInfo.bonusRate,
    availableEarnings: availableEarningsAgg._sum.amount ?? 0,
    lastPaymentDate: lastPayment?.createdAt ?? null,
    lastPaymentAmount: lastPayment?.amount ?? null,
    lastPaymentRef: lastPayment?.referenceNumber ?? null,
  });
}
