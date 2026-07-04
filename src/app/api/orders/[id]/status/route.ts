import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalculateEmployeeCommission } from "@/lib/commission";
import { performDeliveryCleanup } from "@/lib/delivery-cleanup";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, notes } = await request.json();

  const validStatuses = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: { customer: true },
  });

  await prisma.orderTracking.create({
    data: { orderId: id, status, notes: notes || `Status updated to ${status}` },
  });

  if (status === "DELIVERED") {
    await prisma.commission.updateMany({
      where: { orderId: id },
      data: { isPaid: true, paidAt: new Date() },
    });
    await prisma.customer.update({
      where: { id: order.customerId },
      data: { status: "ACTIVE" },
    });
    // Privacy: house photo + GPS were only needed to complete this delivery.
    await performDeliveryCleanup(id, session.userId);
  }

  if (status === "CANCELLED") {
    await recalculateEmployeeCommission(order.employeeId);
  }

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId: order.customerId,
      type: "ORDER_STATUS_CHANGE",
      description: `Order ${order.orderNumber} status changed to ${status}`,
    },
  });

  return NextResponse.json(order);
}
