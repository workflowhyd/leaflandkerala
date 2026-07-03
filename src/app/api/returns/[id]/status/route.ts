import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusLabel } from "@/lib/utils";

const NON_REUSABLE_REASONS = new Set(["DAMAGED_PRODUCT", "EXPIRED_PRODUCT"]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, adminNotes, restock } = body as {
    action: "approve" | "reject" | "complete";
    adminNotes?: string;
    restock?: boolean;
  };

  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: { items: true, order: { select: { orderNumber: true } } },
  });
  if (!returnRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "reject") {
    if (returnRecord.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending returns can be rejected" }, { status: 409 });
    }
    const updated = await prisma.return.update({
      where: { id },
      data: { status: "REJECTED", adminNotes: adminNotes || null },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        customerId: returnRecord.customerId,
        type: "RETURN_STATUS_CHANGE",
        description: `Return ${returnRecord.returnNumber} rejected`,
        metadata: { returnId: id, status: "REJECTED", adminNotes },
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  }

  if (action === "approve") {
    if (returnRecord.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending returns can be approved" }, { status: 409 });
    }

    const shouldRestock = restock ?? !NON_REUSABLE_REASONS.has(returnRecord.reason);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.return.update({
        where: { id },
        data: { status: "APPROVED", adminNotes: adminNotes || null },
      });

      for (const item of returnRecord.items) {
        if (shouldRestock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            returnId: id,
            quantity: shouldRestock ? item.quantity : 0,
            reason: shouldRestock
              ? `Return ${returnRecord.returnNumber} approved — restocked (${getStatusLabel(returnRecord.reason)})`
              : `Return ${returnRecord.returnNumber} approved — not restocked (${getStatusLabel(returnRecord.reason)})`,
          },
        });
      }

      return result;
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        customerId: returnRecord.customerId,
        type: "RETURN_STATUS_CHANGE",
        description: `Return ${returnRecord.returnNumber} approved${shouldRestock ? " — inventory restocked" : ""}`,
        metadata: { returnId: id, status: "APPROVED", restocked: shouldRestock },
      },
    }).catch(() => {});

    return NextResponse.json(updated);
  }

  if (action === "complete") {
    if (returnRecord.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved returns can be marked completed" }, { status: 409 });
    }
    const updated = await prisma.return.update({
      where: { id },
      data: { status: "COMPLETED", adminNotes: adminNotes || returnRecord.adminNotes },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        customerId: returnRecord.customerId,
        type: "RETURN_STATUS_CHANGE",
        description: `Return ${returnRecord.returnNumber} marked completed`,
        metadata: { returnId: id, status: "COMPLETED" },
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
