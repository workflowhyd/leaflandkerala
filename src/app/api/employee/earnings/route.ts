import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getWeekBounds(weeksAgo: number) {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon - weeksAgo * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const weeks = await Promise.all(
    [0, 1, 2, 3].map(async (weeksAgo) => {
      const { start, end } = getWeekBounds(weeksAgo);
      const [commissions, orderCount] = await Promise.all([
        prisma.commission.aggregate({
          where: { employeeId: employee.id, createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.order.count({
          where: { employeeId: employee.id, createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
        }),
      ]);
      const label = weeksAgo === 0 ? "This Week" :
                    weeksAgo === 1 ? "Last Week" :
                    `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
      return {
        label,
        weekStart: start.toISOString(),
        earnings: commissions._sum.amount ?? 0,
        ordersCount: orderCount,
      };
    })
  );

  return NextResponse.json({
    commissionPercent: employee.commissionPercent,
    weeks,
  });
}
