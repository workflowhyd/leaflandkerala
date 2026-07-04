import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.employee = { name: { contains: search, mode: "insensitive" } };
  }

  const [cashouts, total, pendingCount] = await Promise.all([
    prisma.employeeCashout.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { employee: { select: { name: true, mobile: true } } },
    }),
    prisma.employeeCashout.count({ where }),
    prisma.employeeCashout.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({ cashouts, total, page, limit, pendingCount });
}
