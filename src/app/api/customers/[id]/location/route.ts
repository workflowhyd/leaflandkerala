import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { latitude, longitude } = await request.json();

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Latitude and longitude required" }, { status: 400 });
  }

  const location = await prisma.customerLocation.upsert({
    where: { customerId: id },
    create: { customerId: id, latitude, longitude },
    update: { latitude, longitude, updatedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId: id,
      type: "CUSTOMER_VISIT",
      description: `GPS location captured for customer`,
      metadata: { latitude, longitude },
    },
  });

  return NextResponse.json(location);
}
