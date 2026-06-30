import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { rewardId } = body;

  if (!rewardId) {
    return NextResponse.json({ error: "rewardId required" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the reward belongs to this employee
  const reward = await prisma.employeeReward.findFirst({
    where: { id: rewardId, employeeId: employee.id },
  });
  if (!reward) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  const updated = await prisma.employeeReward.update({
    where: { id: rewardId },
    data: { notified: true },
  });

  return NextResponse.json(updated);
}
