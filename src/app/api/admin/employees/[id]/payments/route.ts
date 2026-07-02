import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function generateReference(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${datePart}-${rand}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, commissionPercent: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unpaid commissions for DELIVERED orders
  const unpaidCommissions = await prisma.commission.findMany({
    where: {
      employeeId,
      isPaid: false,
      order: { status: "DELIVERED" },
    },
    include: {
      order: {
        include: {
          customer: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      },
    },
    orderBy: { order: { updatedAt: "asc" } },
  });

  const pendingSalesAmount = unpaidCommissions.reduce((s, c) => s + c.order.totalAmount, 0);
  const pendingCommissionAmount = unpaidCommissions.reduce((s, c) => s + c.amount, 0);

  const pendingOrders = unpaidCommissions.map((c) => ({
    commissionId: c.id,
    orderId: c.order.id,
    orderNumber: c.order.orderNumber,
    customerName: c.order.customer.name,
    deliveredAt: c.order.updatedAt,
    amount: c.order.totalAmount,
    commission: c.amount,
    items: c.order.items.map((i) => ({ name: i.product.name, quantity: i.quantity })),
  }));

  const periodStart = unpaidCommissions[0]?.order.updatedAt ?? null;
  const periodEnd = unpaidCommissions[unpaidCommissions.length - 1]?.order.updatedAt ?? null;

  // Payment history
  const payments = await prisma.employeePayment.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    include: {
      commissions: {
        include: {
          order: {
            select: {
              orderNumber: true, totalAmount: true,
              customer: { select: { name: true } },
              items: { include: { product: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return NextResponse.json({
    employee,
    pendingPayout: {
      ordersCount: unpaidCommissions.length,
      salesAmount: pendingSalesAmount,
      commissionAmount: pendingCommissionAmount,
      periodStart,
      periodEnd,
      orders: pendingOrders,
    },
    payments,
    totalPaid,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await params;

  const unpaidCommissions = await prisma.commission.findMany({
    where: {
      employeeId,
      isPaid: false,
      order: { status: "DELIVERED" },
    },
    include: { order: { select: { totalAmount: true, updatedAt: true } } },
    orderBy: { order: { updatedAt: "asc" } },
  });

  if (unpaidCommissions.length === 0) {
    return NextResponse.json({ error: "No unpaid delivered orders" }, { status: 400 });
  }

  const salesAmount = unpaidCommissions.reduce((s, c) => s + c.order.totalAmount, 0);
  const commissionAmount = unpaidCommissions.reduce((s, c) => s + c.amount, 0);
  const periodStart = unpaidCommissions[0].order.updatedAt;
  const periodEnd = unpaidCommissions[unpaidCommissions.length - 1].order.updatedAt;
  const referenceNumber = generateReference();
  const now = new Date();

  const payment = await prisma.employeePayment.create({
    data: {
      employeeId,
      adminId: session.userId,
      referenceNumber,
      amount: commissionAmount,
      salesAmount,
      commissionAmount,
      ordersCount: unpaidCommissions.length,
      weekStart: periodStart,
      weekEnd: periodEnd,
    },
  });

  await prisma.commission.updateMany({
    where: { id: { in: unpaidCommissions.map((c) => c.id) } },
    data: { isPaid: true, paidAt: now, paymentId: payment.id },
  });

  return NextResponse.json({ payment, referenceNumber });
}
