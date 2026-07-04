import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true, mobile: true } },
      location: true,
      photos: true,
      fieldVisits: {
        orderBy: { visitDate: "desc" },
        take: 10,
        include: { employee: { select: { name: true } } },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { items: { include: { product: { select: { name: true } } } } },
      },
      returns: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { items: { include: { product: { select: { name: true } } } } },
      },
      _count: { select: { orders: true, returns: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "EMPLOYEE" && customer.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(customer);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "EMPLOYEE" && customer.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
