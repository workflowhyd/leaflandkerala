import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const photos = await prisma.customerPhoto.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(photos);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existingPhotos = await prisma.customerPhoto.count({ where: { customerId: id } });
  if (existingPhotos >= 5) {
    return NextResponse.json({ error: "Maximum 5 photos allowed" }, { status: 400 });
  }

  const body = await request.json();
  const { imageData, isFront } = body;

  if (!imageData) return NextResponse.json({ error: "Image data required" }, { status: 400 });

  const { url, publicId } = await uploadImage(imageData, "customers");

  const photo = await prisma.customerPhoto.create({
    data: { customerId: id, imageUrl: url, publicId, isFront: isFront || false },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId: id,
      type: "PHOTO_UPLOAD",
      description: `Photo uploaded for customer`,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
