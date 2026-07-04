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

  const [pendingRegistrations, newOrders, outForDelivery, lowStock, pendingReturns, pendingCashouts] = await Promise.all([
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
    prisma.return.findMany({
      where: { status: "PENDING" },
      include: { customer: { select: { name: true } }, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.employeeCashout.findMany({
      where: { status: "PENDING" },
      include: { employee: { select: { name: true } } },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
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

  for (const ret of pendingReturns) {
    items.push({
      id: `ret-${ret.id}`,
      type: "RETURN_REQUEST",
      title: "Return Request",
      body: `${ret.returnNumber} — ${ret.customer.name} on order ${ret.order.orderNumber}`,
      createdAt: ret.createdAt.toISOString(),
      href: `/dashboard/returns`,
      urgent: true,
    });
  }

  for (const cashout of pendingCashouts) {
    const weekLabel = `${cashout.weekStartDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${cashout.weekEndDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
    items.push({
      id: `cashout-${cashout.id}`,
      type: "CASHOUT_REQUEST",
      title: "New Cash-Out Request",
      body: `${cashout.employee.name} — ${weekLabel} — ₹${cashout.commissionAmount.toLocaleString("en-IN")}`,
      createdAt: cashout.requestedAt.toISOString(),
      href: `/dashboard/cashouts`,
      urgent: true,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    totalCount: pendingRegistrations.length + newOrders.length + pendingReturns.length + pendingCashouts.length,
    pendingRegistrations: pendingRegistrations.length,
    pendingReturns: pendingReturns.length,
    pendingCashouts: pendingCashouts.length,
    lowStockCount: lowStock,
    items,
  });
}
