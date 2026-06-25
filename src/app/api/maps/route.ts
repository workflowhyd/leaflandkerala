import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "customers";

  if (type === "customers") {
    const locations = await prisma.customerLocation.findMany({
      include: {
        customer: {
          select: {
            name: true,
            mobile: true,
            address: true,
            status: true,
            employee: { select: { name: true } },
          },
        },
      },
    });
    return NextResponse.json(locations);
  }

  if (type === "visits") {
    const visits = await prisma.fieldVisit.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      include: {
        employee: { select: { name: true } },
        customer: { select: { name: true, address: true } },
      },
      orderBy: { visitDate: "desc" },
      take: 200,
    });
    return NextResponse.json(visits);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
