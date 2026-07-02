import { prisma } from "@/lib/prisma";

export interface WeeklyCommissionResult {
  weeklySales: number;
  weeklyOrdersDelivered: number;
  commissionRate: number;
  weeklyCommission: number;
  isEligible: boolean;
  threshold: number;
  bonusRate: number;
}

export async function getWeeklyCommission(
  employeeId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyCommissionResult> {
  const [deliveredOrders, settings, employee] = await Promise.all([
    prisma.order.findMany({
      where: {
        employeeId,
        status: "DELIVERED",
        updatedAt: { gte: weekStart, lte: weekEnd },
      },
      select: { id: true, totalAmount: true },
    }),
    prisma.commissionSetting.findFirst(),
    prisma.employee.findUnique({ where: { id: employeeId }, select: { commissionPercent: true } }),
  ]);

  const weeklySales = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const threshold = settings?.weeklyBonusThreshold ?? 50000;
  const bonusRate = settings?.weeklyBonusRate ?? 35;
  const defaultRate = employee?.commissionPercent ?? settings?.defaultPercentage ?? 10;

  const isEligible = weeklySales >= threshold;
  const commissionRate = isEligible ? bonusRate : defaultRate;
  const weeklyCommission = (weeklySales * commissionRate) / 100;

  return {
    weeklySales,
    weeklyOrdersDelivered: deliveredOrders.length,
    commissionRate,
    weeklyCommission,
    isEligible,
    threshold,
    bonusRate,
  };
}

export async function getFreeGiftSettings() {
  const settings = await prisma.commissionSetting.findFirst({
    select: { freeGiftEnabled: true, freeGiftProductName: true, freeGiftMinAmount: true },
  });
  return {
    enabled: settings?.freeGiftEnabled ?? false,
    productName: settings?.freeGiftProductName ?? "Free Gift",
    minAmount: settings?.freeGiftMinAmount ?? 3000,
  };
}
