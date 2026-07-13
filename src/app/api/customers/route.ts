import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (session.role === "EMPLOYEE" && session.employeeId) {
    where.employeeId = session.employeeId;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search } },
      { village: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  let [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        employee: { select: { name: true } },
        location: true,
        photos: { take: 1, where: { isFront: true } },
        _count: { select: { orders: true, fieldVisits: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  // If the requested page no longer exists (e.g. the last item on it was
  // just deleted), fall back to the last valid page instead of returning
  // an empty list while matching records still exist.
  if (customers.length === 0 && total > 0 && page > 1) {
    const safePage = Math.max(1, Math.ceil(total / limit));
    customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * limit,
      take: limit,
      include: {
        employee: { select: { name: true } },
        location: true,
        photos: { take: 1, where: { isFront: true } },
        _count: { select: { orders: true, fieldVisits: true } },
      },
    });
  }

  return NextResponse.json({ customers, total, page, limit });
}

// Admins can no longer add customers here — that's done by employees via
// /api/employee/customers.
export async function POST() {
  return NextResponse.json(
    { error: "Adding customers is only available to employees." },
    { status: 403 }
  );
}
