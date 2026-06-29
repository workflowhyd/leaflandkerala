import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await params;
  const since = new URL(request.url).searchParams.get("since");

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true, name: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateFilter = since ? { gte: new Date(since) } : undefined;

  const [activityLogs, orders, locations] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        userId: employee.userId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, type: true, description: true, metadata: true, createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        employee: { id: employeeId },
        ...(dateFilter && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true,
        customer: { select: { name: true, mobile: true } },
      },
    }),
    prisma.employeeLocation.findMany({
      where: {
        employeeId,
        ...(dateFilter && { capturedAt: dateFilter }),
      },
      orderBy: { capturedAt: "desc" },
      take: 50,
      select: { id: true, latitude: true, longitude: true, accuracy: true, capturedAt: true },
    }),
  ]);

  // Merge into a unified timeline sorted by time
  const timeline = [
    ...activityLogs.map((l) => ({
      id: l.id,
      time: l.createdAt,
      type: l.type,
      label: l.description,
      detail: l.customer?.name ?? null,
      metadata: l.metadata,
      source: "activity" as const,
    })),
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      time: o.createdAt,
      type: "ORDER_CREATE",
      label: `Order ${o.orderNumber} — ₹${o.totalAmount.toLocaleString("en-IN")}`,
      detail: o.customer.name,
      metadata: { orderId: o.id, status: o.status },
      source: "order" as const,
    })),
    ...locations.map((l) => ({
      id: `loc-${l.id}`,
      time: l.capturedAt,
      type: "GPS_CAPTURE",
      label: "Location captured",
      detail: `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}`,
      metadata: { latitude: l.latitude, longitude: l.longitude },
      source: "location" as const,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({ employee: { id: employeeId, name: employee.name }, timeline });
}
