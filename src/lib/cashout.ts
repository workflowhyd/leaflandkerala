import { prisma } from "@/lib/prisma";
import { getWeekRange, recalculateEmployeeCommission } from "@/lib/commission";

export interface CashoutEligibility {
  weekStart: Date;
  weekEnd: Date;
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  eligible: boolean;
  reasons: string[];
  alreadyRequested: boolean;
  existingCashoutStatus: string | null;
}

/**
 * Checks whether an employee can cash out the current business week
 * (Mon–Sat collection, Sun delivery). Eligible only once every delivery for
 * the week is complete, there are no pending returns tied to those orders,
 * commission has been calculated, and the week hasn't already been requested.
 */
export async function getCashoutEligibility(employeeId: string): Promise<CashoutEligibility> {
  const { weekStart, weekEnd } = getWeekRange(new Date());

  const commissionInfo = await recalculateEmployeeCommission(employeeId);

  const weekOrders = await prisma.order.findMany({
    where: { employeeId, createdAt: { gte: weekStart, lte: weekEnd }, status: { not: "CANCELLED" } },
    select: { id: true, status: true },
  });

  const pendingDeliveries = weekOrders.filter((o) => o.status !== "DELIVERED");

  const orderIds = weekOrders.map((o) => o.id);
  const pendingReturns = orderIds.length
    ? await prisma.return.count({ where: { orderId: { in: orderIds }, status: "PENDING" } })
    : 0;

  const existingCashout = await prisma.employeeCashout.findUnique({
    where: { employeeId_weekStartDate: { employeeId, weekStartDate: weekStart } },
    select: { status: true },
  });

  const reasons: string[] = [];
  if (weekOrders.length === 0) {
    reasons.push("No orders recorded for this week");
  } else if (pendingDeliveries.length > 0) {
    reasons.push(`${pendingDeliveries.length} deliver${pendingDeliveries.length === 1 ? "y" : "ies"} still pending`);
  }
  if (pendingReturns > 0) {
    reasons.push(`${pendingReturns} pending return request${pendingReturns === 1 ? "" : "s"} for this week's orders`);
  }
  if (commissionInfo.commissionAmount <= 0 && weekOrders.length > 0) {
    reasons.push("Commission not calculated");
  }
  if (existingCashout) {
    reasons.push("Cash-out already requested for this week");
  }

  return {
    weekStart,
    weekEnd,
    weeklySales: commissionInfo.weeklySales,
    commissionRate: commissionInfo.commissionRate,
    commissionAmount: commissionInfo.commissionAmount,
    eligible: reasons.length === 0,
    reasons,
    alreadyRequested: !!existingCashout,
    existingCashoutStatus: existingCashout?.status ?? null,
  };
}
