import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? "";

  // Check if query is purely numeric (serial number search)
  const isSerial = /^\d{1,4}$/.test(q);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category && { category: category as never }),
      ...(q && {
        OR: isSerial
          ? [
              { serialNumber: { equals: parseInt(q) } },
              { name: { contains: q, mode: "insensitive" } },
            ]
          : [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
      }),
    },
    select: {
      id: true,
      name: true,
      sku: true,
      serialNumber: true,
      price: true,
      salePrice: true,
      imageUrl: true,
      category: true,
    },
    take: 20,
    orderBy: [{ serialNumber: "asc" }],
  });

  return NextResponse.json(products);
}
