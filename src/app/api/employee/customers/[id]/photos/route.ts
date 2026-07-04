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

  const { imageData, isFront, orderId } = await request.json();
  if (!imageData) return NextResponse.json({ error: "imageData required" }, { status: 400 });

  if (orderId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId, employeeId: employee.id } });
    if (!order) return NextResponse.json({ error: "Order not found for this customer" }, { status: 404 });
  }

  try {
    const { url, publicId } = await uploadImage(imageData, "customers");

    const photo = await prisma.customerPhoto.create({
      data: { customerId, orderId: orderId || null, imageUrl: url, publicId, isFront: isFront ?? false },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        customerId,
        type: "PHOTO_UPLOAD",
        description: `House photo uploaded for ${customer.name}`,
        metadata: { imageUrl: url, publicId },
      },
    }).catch((e) => console.error("[customers/photos] activityLog create failed:", e));

    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    console.error("[employee/customers/photos POST] Upload failed:", err);
    return NextResponse.json({ error: "Photo upload failed. Please try again." }, { status: 502 });
  }
}
