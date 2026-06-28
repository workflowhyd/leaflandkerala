import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["SEEDS", "FERTILIZERS", "PESTICIDES", "ORGANIC_PRODUCTS", "FARMING_TOOLS", "IRRIGATION_SUPPLIES", "AGRICULTURAL_EQUIPMENT"]).optional(),
  description: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  salePrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      type: "PRODUCT_UPDATE",
      description: `Updated product: ${product.name}`,
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // If product has order history, soft-delete to preserve data integrity
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

  if (orderItemCount > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({
      success: true,
      softDeleted: true,
      message: "Product deactivated (it has existing orders)",
    });
  }

  // Hard delete — no order references
  await prisma.product.delete({ where: { id } });

  // Delete Cloudinary image if present (non-fatal if it fails)
  if (product.imagePublicId) {
    try {
      const { deleteImage } = await import("@/lib/cloudinary");
      await deleteImage(product.imagePublicId);
    } catch {
      // ignore
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      type: "PRODUCT_UPDATE",
      description: `Deleted product: ${product.name}`,
    },
  });

  return NextResponse.json({ success: true, softDeleted: false });
}
