import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { returnNumber: { contains: search, mode: "insensitive" } },
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { mobile: { contains: search } } },
    ];
  }

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true, mobile: true } },
        order: { select: { orderNumber: true } },
        employee: { select: { name: true } },
        items: { select: { quantity: true, product: { select: { name: true } } } },
        images: { select: { id: true } },
      },
    }),
    prisma.return.count({ where }),
  ]);

  return NextResponse.json({ returns, total, page, limit });
}
