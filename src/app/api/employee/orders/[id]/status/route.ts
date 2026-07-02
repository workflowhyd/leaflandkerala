import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Allowed transitions the employee can make
const ALLOWED: Record<string, string> = {
  NEW:              "PACKED",           // Order Received
  CONFIRMED:        "PACKED",
  PROCESSING:       "PACKED",
  PACKED:           "OUT_FOR_DELIVERY", // Going for Delivery
  OUT_FOR_DELIVERY: "DELIVERED",        // Delivered
};

const LABELS: Record<string, string> = {
  PACKED:           "Order Received",
  OUT_FOR_DELIVERY: "Going for Delivery",
  DELIVERED:        "Delivered",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { latitude, longitude } = body as { latitude?: number; longitude?: number };

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { id, employeeId: employee.id },
    include: { customer: { select: { name: true, mobile: true } } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const nextStatus = ALLOWED[order.status];
  if (!nextStatus) {
    return NextResponse.json(
      { error: `Cannot update order with status ${order.status}` },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: nextStatus as never },
    });

    await tx.orderTracking.create({
      data: { orderId: id, status: nextStatus as never, notes: LABELS[nextStatus] },
    });

    await tx.activityLog.create({
      data: {
        userId: session.userId,
        type: "ORDER_CREATE",
        description: `Order ${order.orderNumber} status updated to ${LABELS[nextStatus] ?? nextStatus} by ${employee.name}`,
        metadata: { orderId: id, from: order.status, to: nextStatus, latitude, longitude },
      },
    });

    if (nextStatus === "DELIVERED" && latitude && longitude) {
      await tx.customerLocation.upsert({
        where: { customerId: order.customerId },
        update: { latitude, longitude, capturedAt: new Date() },
        create: { customerId: order.customerId, latitude, longitude },
      });
    }
  });

  return NextResponse.json({ success: true, status: nextStatus });
}
