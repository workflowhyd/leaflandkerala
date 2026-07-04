import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalculateEmployeeCommission } from "@/lib/commission";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { include: { location: true, photos: { where: { isFront: true } } } },
      employee: { select: { name: true, mobile: true } },
      items: { include: { product: true } },
      tracking: { orderBy: { createdAt: "desc" } },
      commissions: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "EMPLOYEE" && order.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(order);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  await prisma.orderTracking.create({
    data: { orderId: id, status: "CANCELLED", notes: "Order cancelled by admin" },
  });
  await recalculateEmployeeCommission(order.employeeId);

  return NextResponse.json({ success: true });
}
