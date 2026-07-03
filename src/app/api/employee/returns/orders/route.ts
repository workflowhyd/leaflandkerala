import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customerId = new URL(request.url).searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, employeeId: employee.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: {
      customerId,
      employeeId: employee.id,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      deliveryDate: true,
      totalAmount: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(orders);
}
