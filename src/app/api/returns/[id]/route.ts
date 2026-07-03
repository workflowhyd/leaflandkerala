import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, mobile: true, address: true, village: true, district: true } },
      order: { select: { id: true, orderNumber: true, createdAt: true, deliveryDate: true, totalAmount: true } },
      employee: { select: { id: true, name: true, mobile: true } },
      items: {
        include: { product: { select: { id: true, name: true, serialNumber: true, sku: true } } },
      },
      images: { select: { id: true, imageUrl: true } },
    },
  });

  if (!returnRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "EMPLOYEE" && returnRecord.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(returnRecord);
}
