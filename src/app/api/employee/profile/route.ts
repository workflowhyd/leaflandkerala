import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: session.userId },
    select: {
      territory: true,
      commissionPercent: true,
      mobile: true,
      address: true,
    },
  });

  return NextResponse.json({
    name: session.name,
    email: session.email,
    role: session.role,
    employee,
  });
}
