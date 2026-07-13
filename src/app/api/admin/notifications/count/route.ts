import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [pendingRegistrations, pendingReturns] = await Promise.all([
    prisma.employeeRegistrationRequest.count({ where: { status: "PENDING" } }),
    prisma.return.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({ pendingRegistrations, pendingReturns });
}
