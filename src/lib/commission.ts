import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

// Fixed weekly commission slabs — not admin-configurable.
const WEEKLY_COMMISSION_TIERS = [
  { threshold: 40000, rate: 40 },
  { threshold: 15000, rate: 35 },
] as const;
const BASE_COMMISSION_RATE = 30;

export function getCommissionRate(weeklySales: number): number {
  for (const tier of WEEKLY_COMMISSION_TIERS) {
    if (weeklySales >= tier.threshold) return tier.rate;
  }
  return BASE_COMMISSION_RATE;
}

/** Amount of weekly sales still needed to reach the next commission slab, or null if already at the top tier. */
export function getNextSlabInfo(weeklySales: number): { nextRate: number; amountRemaining: number } | null {
  const ascending = [...WEEKLY_COMMISSION_TIERS].sort((a, b) => a.threshold - b.threshold);
  for (const tier of ascending) {
    if (weeklySales < tier.threshold) {
      return { nextRate: tier.rate, amountRemaining: tier.threshold - weeklySales };
    }
  }
  return null;
}

export function getWeekRange(date: Date = new Date()) {
  const day = date.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export function getMonthRange(date: Date = new Date()) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Recomputes an employee's current week/month sales (orders minus returns)
 * and the resulting fixed-tier commission rate/amount, then persists it.
 * Call this after any event that changes an employee's sales: order
 * create/cancel, or a completed return.
 */
export async function recalculateEmployeeCommission(employeeId: string, client: DbClient = prisma) {
  const now = new Date();
  const { weekStart, weekEnd } = getWeekRange(now);
  const { monthStart, monthEnd } = getMonthRange(now);

  const [monthOrders, weekOrders, monthReturnItems, weekReturnItems] = await Promise.all([
    client.order.aggregate({
      where: { employeeId, status: { not: "CANCELLED" }, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true },
    }),
    client.order.aggregate({
      where: { employeeId, status: { not: "CANCELLED" }, createdAt: { gte: weekStart, lte: weekEnd } },
      _sum: { totalAmount: true },
    }),
    client.returnItem.findMany({
      where: { return: { employeeId, createdAt: { gte: monthStart, lte: monthEnd } } },
      select: { quantity: true, orderItem: { select: { price: true } } },
    }),
    client.returnItem.findMany({
      where: { return: { employeeId, createdAt: { gte: weekStart, lte: weekEnd } } },
      select: { quantity: true, orderItem: { select: { price: true } } },
    }),
  ]);

  const monthReturnsTotal = monthReturnItems.reduce((s, i) => s + i.quantity * i.orderItem.price, 0);
  const weekReturnsTotal = weekReturnItems.reduce((s, i) => s + i.quantity * i.orderItem.price, 0);

  const monthlySales = Math.max(0, (monthOrders._sum.totalAmount ?? 0) - monthReturnsTotal);
  const weeklySales = Math.max(0, (weekOrders._sum.totalAmount ?? 0) - weekReturnsTotal);

  // Commission is a weekly concept: rate is set by this week's slab, and the
  // resulting amount is this week's cash-out-eligible commission.
  const commissionRate = getCommissionRate(weeklySales);
  const commissionAmount = (weeklySales * commissionRate) / 100;

  await client.employee.update({
    where: { id: employeeId },
    data: {
      monthlySales,
      weeklySales,
      commissionRate,
      commissionAmount,
      commissionPercent: commissionRate,
      lastCommissionCalculation: now,
    },
  });

  return { monthlySales, weeklySales, commissionRate, commissionAmount };
}

export async function getFreeGiftSettings() {
  const settings = await prisma.commissionSetting.findFirst({
    select: {
      freeGiftEnabled: true,
      freeGiftTier1MinAmount: true,
      freeGiftTier1Choices: true,
      freeGiftTier2MinAmount: true,
      freeGiftTier2Choices: true,
    },
  });
  return {
    enabled: settings?.freeGiftEnabled ?? false,
    tier1MinAmount: settings?.freeGiftTier1MinAmount ?? 5000,
    tier1Choices: settings?.freeGiftTier1Choices ?? 1,
    tier2MinAmount: settings?.freeGiftTier2MinAmount ?? 10000,
    tier2Choices: settings?.freeGiftTier2Choices ?? 2,
  };
}

export type FreeGiftSettings = Awaited<ReturnType<typeof getFreeGiftSettings>>;

/** How many free gift items the customer may choose, given the cart total and current tier settings. */
export function getGiftChoicesAllowed(cartTotal: number, settings: FreeGiftSettings): number {
  if (!settings.enabled) return 0;
  if (cartTotal >= settings.tier2MinAmount) return settings.tier2Choices;
  if (cartTotal >= settings.tier1MinAmount) return settings.tier1Choices;
  return 0;
}
