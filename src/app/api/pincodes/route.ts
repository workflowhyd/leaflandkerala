import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pincodes = await prisma.pincode.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { customers: true } } },
  });

  return NextResponse.json(pincodes);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code, area, district, state } = await request.json();
  if (!code) return NextResponse.json({ error: "Pincode required" }, { status: 400 });

  const existing = await prisma.pincode.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Pincode already exists" }, { status: 409 });

  const pincode = await prisma.pincode.create({
    data: { code, area, district, state: state || "Telangana" },
  });

  return NextResponse.json(pincode, { status: 201 });
}
