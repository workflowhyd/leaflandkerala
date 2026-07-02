import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [pendingRegistrations, newOrders, outForDelivery, lowStock] = await Promise.all([
    prisma.employeeRegistrationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: last24h }, status: { not: "CANCELLED" } },
      include: { customer: { select: { name: true } }, employee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.order.findMany({
      where: { status: "OUT_FOR_DELIVERY", updatedAt: { gte: last48h } },
      include: { customer: { select: { name: true } }, employee: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.product.count({ where: { stock: { lt: 10 }, isActive: true } }),
  ]);

  type NotificationItem = {
    id: string;
    type: string;
    title: string;
    body: string;
    createdAt: string;
    href: string;
    urgent: boolean;
  };

  const items: NotificationItem[] = [];

  for (const reg of pendingRegistrations) {
    items.push({
      id: `reg-${reg.id}`,
      type: "REGISTRATION",
      title: "New Employee Registration",
      body: `${reg.fullName} (${reg.mobileNumber}) submitted a registration request`,
      createdAt: reg.submittedAt.toISOString(),
      href: `/dashboard/notifications`,
      urgent: true,
    });
  }

  for (const order of newOrders) {
    items.push({
      id: `order-${order.id}`,
      type: "NEW_ORDER",
      title: "New Order",
      body: `${order.orderNumber} — ${order.customer.name} via ${order.employee.name} (₹${order.totalAmount.toLocaleString("en-IN")})`,
      createdAt: order.createdAt.toISOString(),
      href: `/dashboard/orders/${order.id}`,
      urgent: false,
    });
  }

  for (const order of outForDelivery) {
    items.push({
      id: `del-${order.id}`,
      type: "PENDING_DELIVERY",
      title: "Pending Delivery",
      body: `${order.orderNumber} — ${order.customer.name} is out for delivery with ${order.employee.name}`,
      createdAt: order.updatedAt.toISOString(),
      href: `/dashboard/orders/${order.id}`,
      urgent: false,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    totalCount: pendingRegistrations.length + newOrders.length,
    pendingRegistrations: pendingRegistrations.length,
    lowStockCount: lowStock,
    items,
  });
}
