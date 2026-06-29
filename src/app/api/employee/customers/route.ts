import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const mobile = new URL(request.url).searchParams.get("mobile") ?? "";

  const where: Record<string, unknown> = { employeeId: employee.id };

  if (mobile) {
    where.mobile = { contains: mobile };
  } else if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true, name: true, mobile: true, address: true,
      village: true, district: true, pincode: true, status: true,
      interestedProduct: true,
      location: { select: { latitude: true, longitude: true } },
    },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { name, mobile, address, village, district, pincode, landmark, notes } = body;

  if (!name || !mobile || !address || !district || !pincode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if customer exists with this mobile
  const existing = await prisma.customer.findFirst({ where: { mobile, employeeId: employee.id } });
  if (existing) {
    return NextResponse.json({ error: "Customer with this mobile already exists", customer: existing }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      name, mobile, address, village, district, pincode,
      landmark, notes, state: "Telangana",
      employeeId: employee.id,
      status: "LEAD",
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
