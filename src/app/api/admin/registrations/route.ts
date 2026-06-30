import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { RegistrationStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  const where: { status?: RegistrationStatus } = {};
  if (
    statusParam &&
    ["PENDING", "APPROVED", "REJECTED"].includes(statusParam)
  ) {
    where.status = statusParam as RegistrationStatus;
  }

  const [requests, total, pendingCount] = await Promise.all([
    prisma.employeeRegistrationRequest.findMany({
      where,
      orderBy: { submittedAt: "desc" },
    }),
    prisma.employeeRegistrationRequest.count({ where }),
    prisma.employeeRegistrationRequest.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({ requests, total, pendingCount });
}
