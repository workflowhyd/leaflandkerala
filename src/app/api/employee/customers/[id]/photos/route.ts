import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: customerId } = await params;
  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, employeeId: employee.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { imageData, isFront } = await request.json();
  if (!imageData) return NextResponse.json({ error: "imageData required" }, { status: 400 });

  const { url, publicId } = await uploadImage(imageData, "customers");

  const photo = await prisma.customerPhoto.create({
    data: { customerId, imageUrl: url, publicId, isFront: isFront ?? false },
  });

  // Activity log
  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId,
      type: "PHOTO_UPLOAD",
      description: `House photo uploaded for ${customer.name}`,
      metadata: { imageUrl: url, publicId },
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
