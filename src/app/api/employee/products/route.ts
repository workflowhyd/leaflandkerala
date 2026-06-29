import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(q.length > 0 && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      salePrice: true,
      imageUrl: true,
      category: true,
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}
