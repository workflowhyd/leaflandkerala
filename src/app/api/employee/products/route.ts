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
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = 10;

  // Check if query is purely numeric (serial number search)
  const isSerial = /^\d{1,4}$/.test(q);

  const where = {
    isActive: true,
    ...(category && { category: category as never }),
    ...(q && {
      OR: isSerial
        ? [
            { serialNumber: { equals: parseInt(q) } },
            { name: { contains: q, mode: "insensitive" as const } },
          ]
        : [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ serialNumber: "asc" }],
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}
