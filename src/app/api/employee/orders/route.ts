import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  sat.setHours(23, 59, 59, 999);
  return { weekStart: mon, weekEnd: sat };
}

function generateOrderNumber(): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${ymd}-${rand}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const view = new URL(request.url).searchParams.get("view") ?? "week";
  const { weekStart, weekEnd } = getWeekRange();

  const where =
    view === "week"
      ? { employeeId: employee.id, createdAt: { gte: weekStart, lte: weekEnd } }
      : { employeeId: employee.id };

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      notes: true,
      deliveryDate: true,
      createdAt: true,
      customer: { select: { id: true, name: true, mobile: true, village: true } },
      items: {
        select: {
          quantity: true,
          price: true,
          subtotal: true,
          product: { select: { id: true, name: true, sku: true, imageUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: view === "week" ? 50 : 20,
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { customerId, items, notes, latitude, longitude } = body as {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    notes?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!customerId || !items?.length) {
    return NextResponse.json({ error: "customerId and items are required" }, { status: 400 });
  }

  // Verify customer belongs to this employee
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, employeeId: employee.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Compute totals
  const orderItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity,
  }));
  const totalAmount = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

  // Delivery = next Sunday
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const deliveryDate = new Date(now);
  deliveryDate.setDate(now.getDate() + daysUntilSunday);
  deliveryDate.setHours(9, 0, 0, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        employeeId: employee.id,
        totalAmount,
        notes,
        deliveryDate,
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        customer: { select: { name: true, mobile: true } },
      },
    });

    // Create commission record
    await tx.commission.create({
      data: {
        employeeId: employee.id,
        orderId: created.id,
        amount: (totalAmount * employee.commissionPercent) / 100,
        percentage: employee.commissionPercent,
      },
    });

    // Store GPS if provided
    if (latitude && longitude) {
      await tx.customerLocation.upsert({
        where: { customerId },
        update: { latitude, longitude, capturedAt: new Date() },
        create: { customerId, latitude, longitude },
      });
    }

    return created;
  });

  return NextResponse.json(order, { status: 201 });
}
