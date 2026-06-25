import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const visitSchema = z.object({
  customerId: z.string(),
  visitDate: z.string(),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (session.role === "EMPLOYEE" && session.employeeId) {
    where.employeeId = session.employeeId;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }

  const [visits, total] = await Promise.all([
    prisma.fieldVisit.findMany({
      where,
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        employee: { select: { name: true } },
        customer: { select: { name: true, mobile: true, address: true } },
      },
    }),
    prisma.fieldVisit.count({ where }),
  ]);

  return NextResponse.json({ visits, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const employeeId = session.role === "EMPLOYEE" ? session.employeeId! : (body.employeeId || session.employeeId!);

  const visit = await prisma.fieldVisit.create({
    data: {
      ...parsed.data,
      employeeId,
      visitDate: new Date(parsed.data.visitDate),
    },
    include: {
      customer: { select: { name: true } },
      employee: { select: { name: true } },
    },
  });

  await prisma.customer.update({
    where: { id: parsed.data.customerId },
    data: { status: "VISITED" },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId: parsed.data.customerId,
      type: "CUSTOMER_VISIT",
      description: `Field visit recorded for customer ${visit.customer.name}`,
      metadata: { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
    },
  });

  return NextResponse.json(visit, { status: 201 });
}
