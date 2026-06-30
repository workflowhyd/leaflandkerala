import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const offers = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rewards: true } } },
  });

  return NextResponse.json(offers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, offerType, bannerImage, startDate, endDate, targetGroup, isActive } = body;

  if (!title || !description || !offerType) {
    return NextResponse.json({ error: "title, description and offerType are required" }, { status: 400 });
  }

  const offer = await prisma.offer.create({
    data: {
      title,
      description,
      offerType,
      bannerImage: bannerImage || null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      targetGroup: targetGroup || "ALL",
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json(offer, { status: 201 });
}
