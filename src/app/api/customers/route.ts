import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10).max(15),
  alternateMobile: z.string().optional().nullable(),
  address: z.string().min(5),
  village: z.string().optional().nullable(),
  district: z.string().min(2),
  state: z.string().default("Telangana"),
  pincode: z.string().min(6).max(6),
  landmark: z.string().optional().nullable(),
  interestedProduct: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["LEAD", "VISITED", "INTERESTED", "FOLLOW_UP", "ORDER_PLACED", "ACTIVE"]).default("LEAD"),
});

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

  const [customers, total] = await Promise.all([
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

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const allowedPincode = await prisma.pincode.findFirst({
    where: { code: parsed.data.pincode, isActive: true },
  });
  if (!allowedPincode) {
    return NextResponse.json({ error: "Service not available in this pincode" }, { status: 400 });
  }

  const employeeId = session.role === "EMPLOYEE" ? session.employeeId! : (body.employeeId || session.employeeId!);

  const customer = await prisma.customer.create({
    data: {
      ...parsed.data,
      employeeId,
      pincodeId: allowedPincode.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId: customer.id,
      type: "CUSTOMER_REGISTER",
      description: `Registered customer: ${customer.name}`,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
