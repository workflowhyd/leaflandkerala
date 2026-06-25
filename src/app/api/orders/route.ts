import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const orderSchema = z.object({
  customerId: z.string(),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
  deliveryDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (session.role === "EMPLOYEE" && session.employeeId) {
    where.employeeId = session.employeeId;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true, mobile: true, address: true } },
        employee: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
    include: { pincodeRef: true },
  });

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  if (!customer.pincodeId) {
    const allowedPincode = await prisma.pincode.findFirst({
      where: { code: customer.pincode, isActive: true },
    });
    if (!allowedPincode) {
      return NextResponse.json({ error: "Service not available in this area" }, { status: 400 });
    }
  }

  const totalAmount = parsed.data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const employeeId = session.role === "EMPLOYEE" ? session.employeeId! : (body.employeeId || session.employeeId!);

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: parsed.data.customerId,
      employeeId,
      totalAmount,
      notes: parsed.data.notes,
      deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : undefined,
      pincodeId: customer.pincodeId,
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
      },
      tracking: {
        create: { status: "NEW", notes: "Order created" },
      },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  const commissionSetting = await prisma.commissionSetting.findFirst();
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  const commissionPct = employee?.commissionPercent || commissionSetting?.defaultPercentage || 10;

  await prisma.commission.create({
    data: {
      employeeId,
      orderId: order.id,
      amount: (totalAmount * commissionPct) / 100,
      percentage: commissionPct,
    },
  });

  await prisma.customer.update({
    where: { id: parsed.data.customerId },
    data: { status: "ORDER_PLACED" },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      customerId: parsed.data.customerId,
      type: "ORDER_CREATE",
      description: `Order ${order.orderNumber} created for ${customer.name}`,
    },
  });

  if (parsed.data.deliveryDate) {
    const reminderDate = new Date(parsed.data.deliveryDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    await prisma.deliverySchedule.create({
      data: { orderId: order.id, scheduledDate: new Date(parsed.data.deliveryDate) },
    });
  }

  return NextResponse.json(order, { status: 201 });
}
