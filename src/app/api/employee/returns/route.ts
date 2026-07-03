import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/cloudinary";
import type { Prisma } from "@prisma/client";

const RETURN_REASONS = [
  "DAMAGED_PRODUCT",
  "WRONG_PRODUCT_DELIVERED",
  "EXPIRED_PRODUCT",
  "POOR_QUALITY",
  "CUSTOMER_CHANGED_MIND",
  "EXCESS_QUANTITY_ORDERED",
  "PACKAGING_ISSUE",
  "OTHER",
] as const;

function generateReturnNumber(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RET-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const returns = await prisma.return.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      returnNumber: true,
      status: true,
      reason: true,
      createdAt: true,
      order: { select: { orderNumber: true } },
      customer: { select: { name: true, mobile: true } },
      items: { select: { quantity: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(returns);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    orderId: string;
    items: { orderItemId: string; productId: string; quantity: number }[];
    reason: string;
    reasonNotes?: string;
    notes?: string;
    images?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { orderId, items, reason, reasonNotes, notes, images } = body;

  if (!orderId || !items?.length) {
    return NextResponse.json({ error: "orderId and items are required" }, { status: 400 });
  }
  if (!RETURN_REASONS.includes(reason as (typeof RETURN_REASONS)[number])) {
    return NextResponse.json({ error: "Invalid return reason" }, { status: 400 });
  }
  if (reason === "OTHER" && !reasonNotes?.trim()) {
    return NextResponse.json({ error: "Please describe the reason for the return" }, { status: 400 });
  }
  if (images && images.length > 3) {
    return NextResponse.json({ error: "You can upload a maximum of 3 photos" }, { status: 400 });
  }
  if (items.some((i) => !i.quantity || i.quantity < 1)) {
    return NextResponse.json({ error: "Return quantity must be at least 1" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
    if (!employee) return NextResponse.json({ error: "Employee account not found" }, { status: 404 });

    const order = await prisma.order.findFirst({
      where: { id: orderId, employeeId: employee.id },
      include: { customer: true, items: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found or does not belong to you" }, { status: 404 });

    const orderItemIds = items.map((i) => i.orderItemId);
    const orderItemsById = new Map(order.items.map((oi) => [oi.id, oi]));
    if (orderItemIds.some((id) => !orderItemsById.has(id))) {
      return NextResponse.json({ error: "One or more items do not belong to this order" }, { status: 400 });
    }

    // Re-validate returnable quantity server-side against already-claimed returns.
    const claimed = await prisma.returnItem.groupBy({
      by: ["orderItemId"],
      where: {
        orderItemId: { in: orderItemIds },
        return: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } },
      },
      _sum: { quantity: true },
    });
    const claimedMap = new Map(claimed.map((c) => [c.orderItemId, c._sum.quantity ?? 0]));

    for (const item of items) {
      const orderItem = orderItemsById.get(item.orderItemId)!;
      const alreadyClaimed = claimedMap.get(item.orderItemId) ?? 0;
      const returnable = orderItem.quantity - alreadyClaimed;
      if (item.quantity > returnable) {
        return NextResponse.json(
          { error: `Return quantity for one item exceeds the ${returnable} unit(s) still eligible for return.` },
          { status: 400 }
        );
      }
      if (item.productId !== orderItem.productId) {
        return NextResponse.json({ error: "Product mismatch for one or more items" }, { status: 400 });
      }
    }

    const uploadedImages = images?.length
      ? await Promise.all(images.map((img) => uploadImage(img, "returns")))
      : [];

    const returnRecord = await prisma.$transaction(async (tx) => {
      let created: Prisma.ReturnGetPayload<{
        include: { items: { include: { product: { select: { name: true } } } }; images: true };
      }> | null = null;
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          created = await tx.return.create({
            data: {
              returnNumber: generateReturnNumber(),
              orderId,
              customerId: order.customerId,
              employeeId: employee.id,
              reason: reason as (typeof RETURN_REASONS)[number],
              reasonNotes: reasonNotes?.trim() || null,
              notes: notes?.trim() || null,
              items: {
                create: items.map((i) => ({
                  orderItemId: i.orderItemId,
                  productId: i.productId,
                  quantity: i.quantity,
                })),
              },
              images: {
                create: uploadedImages.map((img) => ({ imageUrl: img.url, publicId: img.publicId })),
              },
            },
            include: {
              items: { include: { product: { select: { name: true } } } },
              images: true,
            },
          });
          break;
        } catch (err: unknown) {
          const isPrismaUnique =
            err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
          if (isPrismaUnique && attempt < 2) {
            lastError = err;
            continue;
          }
          throw err;
        }
      }
      if (!created) throw lastError;
      return created;
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        customerId: order.customerId,
        type: "RETURN_CREATE",
        description: `Return ${returnRecord.returnNumber} requested for order ${order.orderNumber} — ${returnRecord.items.length} item(s)`,
        metadata: {
          returnId: returnRecord.id,
          returnNumber: returnRecord.returnNumber,
          orderId,
          reason,
        },
      },
    }).catch((e) => console.error("[employee/returns] activityLog RETURN_CREATE failed:", e));

    return NextResponse.json(returnRecord, { status: 201 });
  } catch (err) {
    console.error("[employee/returns POST] Error:", err);
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "Unknown error";
    return NextResponse.json({ error: `Return could not be saved: ${message}` }, { status: 500 });
  }
}
