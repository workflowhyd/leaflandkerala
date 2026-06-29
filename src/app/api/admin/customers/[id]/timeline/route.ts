import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: customerId } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true, mobile: true, status: true, createdAt: true },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [activityLogs, orders, fieldVisits, photos] = await Promise.all([
    prisma.activityLog.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, description: true, metadata: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true,
        items: { select: { quantity: true, product: { select: { name: true } } } },
      },
    }),
    prisma.fieldVisit.findMany({
      where: { customerId },
      orderBy: { visitDate: "desc" },
      select: { id: true, visitDate: true, notes: true, latitude: true, longitude: true },
    }),
    prisma.customerPhoto.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: { id: true, imageUrl: true, isFront: true, createdAt: true },
    }),
  ]);

  const timeline = [
    // Customer created
    { id: "created", time: customer.createdAt, type: "CUSTOMER_REGISTER", label: "Customer registered", detail: null, metadata: null },
    ...activityLogs.map((l) => ({
      id: l.id, time: l.createdAt, type: l.type, label: l.description,
      detail: null, metadata: l.metadata,
    })),
    ...orders.map((o) => ({
      id: `order-${o.id}`, time: o.createdAt, type: "ORDER_CREATE",
      label: `Order ${o.orderNumber} placed — ₹${o.totalAmount.toLocaleString("en-IN")}`,
      detail: o.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", "),
      metadata: { orderId: o.id, status: o.status },
    })),
    ...fieldVisits.map((v) => ({
      id: `visit-${v.id}`, time: v.visitDate, type: "CUSTOMER_VISIT",
      label: "Field visit recorded",
      detail: v.notes ?? null,
      metadata: v.latitude ? { latitude: v.latitude, longitude: v.longitude } : null,
    })),
    ...photos.map((p) => ({
      id: `photo-${p.id}`, time: p.createdAt, type: "PHOTO_UPLOAD",
      label: p.isFront ? "Front photo uploaded" : "House photo uploaded",
      detail: null, metadata: { imageUrl: p.imageUrl },
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({ customer, timeline });
}
