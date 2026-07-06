import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, employeeId: employee.id },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      deliveryDate: true,
      totalAmount: true,
      status: true,
      customer: { select: { id: true, name: true, mobile: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          isGift: true,
          product: { select: { id: true, name: true, serialNumber: true, sku: true } },
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Quantities already claimed by an active (non-rejected) return, per order item.
  const claimed = await prisma.returnItem.groupBy({
    by: ["orderItemId"],
    where: {
      orderItemId: { in: order.items.map((i) => i.id) },
      return: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } },
    },
    _sum: { quantity: true },
  });
  const claimedMap = new Map(claimed.map((c) => [c.orderItemId, c._sum.quantity ?? 0]));

  // Free gift items aren't manually returnable — they're reclaimed automatically
  // when a return drops the order below the gift-eligible tier (see returns POST route).
  const items = order.items.filter((item) => !item.isGift).map((item) => {
    const alreadyClaimed = claimedMap.get(item.id) ?? 0;
    return {
      orderItemId: item.id,
      productId: item.product.id,
      name: item.product.name,
      serialNumber: item.product.serialNumber,
      sku: item.product.sku,
      orderedQuantity: item.quantity,
      returnableQuantity: Math.max(0, item.quantity - alreadyClaimed),
    };
  });

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    deliveryDate: order.deliveryDate,
    totalAmount: order.totalAmount,
    status: order.status,
    customer: order.customer,
    items,
  });
}
