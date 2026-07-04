import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, adminNotes } = body as { action: "approve" | "reject" | "markPaid"; adminNotes?: string };

  const cashout = await prisma.employeeCashout.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  if (!cashout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    if (cashout.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 409 });
    }
    const updated = await prisma.employeeCashout.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), adminNotes: adminNotes || null },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        type: "CASHOUT_STATUS_CHANGE",
        description: `Cash-out request for ${cashout.employee.name} approved`,
        metadata: { cashoutId: id, status: "APPROVED" },
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  }

  if (action === "reject") {
    if (cashout.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending requests can be rejected" }, { status: 409 });
    }
    const updated = await prisma.employeeCashout.update({
      where: { id },
      data: { status: "REJECTED", adminNotes: adminNotes || null },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        type: "CASHOUT_STATUS_CHANGE",
        description: `Cash-out request for ${cashout.employee.name} rejected`,
        metadata: { cashoutId: id, status: "REJECTED", adminNotes },
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  }

  if (action === "markPaid") {
    if (cashout.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved requests can be marked as paid" }, { status: 409 });
    }
    const updated = await prisma.employeeCashout.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date(), adminNotes: adminNotes || cashout.adminNotes },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        type: "CASHOUT_STATUS_CHANGE",
        description: `Cash-out request for ${cashout.employee.name} marked as paid (₹${cashout.commissionAmount.toLocaleString("en-IN")})`,
        metadata: { cashoutId: id, status: "PAID" },
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
