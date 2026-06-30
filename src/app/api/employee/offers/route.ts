import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: session.userId },
    select: { id: true, isActive: true, createdAt: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();

  // Calculate months of service
  const joinDate = new Date(employee.createdAt);
  const diffMs = now.getTime() - joinDate.getTime();
  const monthsOfService = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const is6MonthEligible = employee.createdAt <= sixMonthsAgo;

  // Find active offers matching target group
  const targetGroups: ("ALL" | "ACTIVE_ONLY")[] = employee.isActive
    ? ["ALL", "ACTIVE_ONLY"]
    : ["ALL"];

  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      AND: [
        { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        { targetGroup: { in: targetGroups } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  let newRewards: {
    id: string;
    employeeId: string;
    offerId: string;
    achievedOn: Date;
    claimed: boolean;
    claimedOn: Date | null;
    notified: boolean;
    createdAt: Date;
  }[] = [];

  if (is6MonthEligible) {
    const sixMonthOffers = offers.filter((o) => o.offerType === "SIX_MONTHS_BONUS");

    for (const offer of sixMonthOffers) {
      await prisma.employeeReward.upsert({
        where: { employeeId_offerId: { employeeId: employee.id, offerId: offer.id } },
        create: { employeeId: employee.id, offerId: offer.id },
        update: {},
      });
    }

    // Get unnotified rewards
    newRewards = await prisma.employeeReward.findMany({
      where: {
        employeeId: employee.id,
        notified: false,
        offer: { offerType: "SIX_MONTHS_BONUS" },
      },
    });
  }

  return NextResponse.json({ offers, newRewards, monthsOfService, is6MonthEligible });
}
