import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [payments, unpaidSum] = await Promise.all([
    prisma.employeePayment.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        referenceNumber: true,
        amount: true,
        salesAmount: true,
        ordersCount: true,
        weekStart: true,
        weekEnd: true,
        createdAt: true,
      },
    }),
    prisma.commission.aggregate({
      where: {
        employeeId: employee.id,
        isPaid: false,
        order: { status: "DELIVERED" },
      },
      _sum: { amount: true },
    }),
  ]);

  const lastPayment = payments[0] ?? null;

  return NextResponse.json({
    payments,
    availableEarnings: unpaidSum._sum.amount ?? 0,
    lastPaymentDate: lastPayment?.createdAt ?? null,
    totalPaid: payments.reduce((s, p) => s + p.amount, 0),
  });
}
