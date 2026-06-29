import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { latitude, longitude, accuracy } = await request.json();
  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
  }

  await prisma.employeeLocation.create({
    data: { employeeId: employee.id, latitude, longitude, accuracy },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employeeId = new URL(request.url).searchParams.get("employeeId");
  const since = new URL(request.url).searchParams.get("since"); // ISO date for today's route

  const where: Record<string, unknown> = employeeId ? { employeeId } : {};
  if (since) where.capturedAt = { gte: new Date(since) };

  const locations = await prisma.employeeLocation.findMany({
    where,
    orderBy: { capturedAt: "desc" },
    take: 200,
    select: {
      id: true, latitude: true, longitude: true, accuracy: true, capturedAt: true,
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(locations);
}
