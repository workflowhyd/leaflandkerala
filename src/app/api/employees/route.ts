import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(8),
  address: z.string().optional(),
  commissionPercent: z.number().min(5).max(15).default(10),
  territory: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search } },
    ];
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        documents: true,
        _count: { select: { customers: true, orders: true, fieldVisits: true } },
        commissions: { select: { amount: true } },
      },
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({ employees, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: "EMPLOYEE",
      employee: {
        create: {
          name: parsed.data.name,
          email: parsed.data.email,
          mobile: parsed.data.mobile,
          address: parsed.data.address,
          commissionPercent: parsed.data.commissionPercent,
          territory: parsed.data.territory,
        },
      },
    },
    include: { employee: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      type: "EMPLOYEE_CREATE",
      description: `Created employee: ${user.name}`,
    },
  });

  return NextResponse.json({ id: user.employee?.id, name: user.name, email: user.email }, { status: 201 });
}
