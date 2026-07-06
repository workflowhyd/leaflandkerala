import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const giftItems = await prisma.giftItem.findMany({
    where: { isActive: true, product: { isActive: true, stock: { gt: 0 } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      product: {
        select: { id: true, name: true, sku: true, serialNumber: true, imageUrl: true, stock: true },
      },
    },
  });

  return NextResponse.json(giftItems);
}
