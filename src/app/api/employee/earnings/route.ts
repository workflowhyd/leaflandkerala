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

      // Only count DELIVERED orders for stats
      const deliveredOrders = await prisma.order.findMany({
        where: {
          employeeId: employee.id,
          status: "DELIVERED",
          updatedAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          totalAmount: true,
          items: { select: { quantity: true } },
        },
      });

      const ordersDelivered = deliveredOrders.length;
      const salesAmount = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
      const productsDelivered = deliveredOrders.reduce(
        (s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0),
        0
      );

      // Get commissions for those delivered orders
      const commissions = deliveredOrders.length > 0
        ? await prisma.commission.aggregate({
            where: { employeeId: employee.id, orderId: { in: deliveredOrders.map((o) => o.id) } },
            _sum: { amount: true },
          })
        : { _sum: { amount: 0 } };

      const earnings = commissions._sum.amount ?? 0;

      const label =
        weeksAgo === 0
          ? "This Week"
          : weeksAgo === 1
          ? "Last Week"
          : `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

      return {
        label,
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        ordersDelivered,
        salesAmount,
        productsDelivered,
        earnings,
      };
    })
  );

  return NextResponse.json({
    commissionPercent: employee.commissionPercent,
    weeks,
  });
}
