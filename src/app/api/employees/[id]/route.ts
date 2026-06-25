import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      documents: true,
      pincodes: { include: { pincode: true } },
      customers: { select: { id: true, name: true, status: true }, take: 10 },
      orders: { select: { id: true, orderNumber: true, totalAmount: true, status: true }, take: 10 },
      commissions: true,
      _count: { select: { customers: true, orders: true, fieldVisits: true } },
    },
  });

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name: body.name,
      mobile: body.mobile,
      address: body.address,
      commissionPercent: body.commissionPercent,
      territory: body.territory,
      isActive: body.isActive,
    },
  });

  if (body.isActive !== undefined) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: body.isActive },
    });
  }

  return NextResponse.json(employee);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const employee = await prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });
  await prisma.user.update({ where: { id: employee.userId }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
