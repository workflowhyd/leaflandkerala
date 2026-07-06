import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const MAX_GIFT_ITEMS = 5;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const giftItems = await prisma.giftItem.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: { id: true, name: true, sku: true, serialNumber: true, imageUrl: true, price: true, stock: true, isActive: true },
      },
    },
  });

  return NextResponse.json(giftItems);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const serialNumber = parseInt(body.serialNumber, 10);
  if (!serialNumber || Number.isNaN(serialNumber)) {
    return NextResponse.json({ error: "A valid product serial number is required" }, { status: 400 });
  }

  const count = await prisma.giftItem.count();
  if (count >= MAX_GIFT_ITEMS) {
    return NextResponse.json({ error: `Only ${MAX_GIFT_ITEMS} gift items are allowed in the pool. Remove one before adding another.` }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { serialNumber } });
  if (!product) {
    return NextResponse.json({ error: `No product found with serial number ${serialNumber}` }, { status: 404 });
  }

  const existing = await prisma.giftItem.findUnique({ where: { productId: product.id } });
  if (existing) {
    return NextResponse.json({ error: "This product is already in the gift pool" }, { status: 409 });
  }

  const giftItem = await prisma.giftItem.create({
    data: { productId: product.id },
    include: {
      product: {
        select: { id: true, name: true, sku: true, serialNumber: true, imageUrl: true, price: true, stock: true, isActive: true },
      },
    },
  });

  return NextResponse.json(giftItem, { status: 201 });
}
