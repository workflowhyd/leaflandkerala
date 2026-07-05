import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";
import { recalculateEmployeeCommission } from "@/lib/commission";
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

  const scopeWhere: Record<string, unknown> = {};
  if (session.role === "EMPLOYEE" && session.employeeId) {
    scopeWhere.employeeId = session.employeeId;
  } else if (employeeId) {
    scopeWhere.employeeId = employeeId;
  }

  const where: Record<string, unknown> = { ...scopeWhere };
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status) where.status = status;

  const [orders, total, statusCounts, scopedTotal] = await Promise.all([
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
    // Status breakdown across the employee/search scope (ignoring the current
    // status filter itself) — a single grouped aggregate instead of fetching
    // up to 1000 rows and counting client-side.
    prisma.order.groupBy({ by: ["status"], where: scopeWhere, _count: { status: true } }),
    prisma.order.count({ where: scopeWhere }),
  ]);

  const counts = {
    total: scopedTotal,
    NEW: 0,
    PROCESSING: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  for (const row of statusCounts) {
    if (row.status in counts) counts[row.status as keyof typeof counts] = row._count.status;
  }

  return NextResponse.json({ orders, total, page, limit, counts });
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

  const { commissionRate } = await recalculateEmployeeCommission(employeeId);

  await prisma.commission.create({
    data: {
      employeeId,
      orderId: order.id,
      amount: (totalAmount * commissionRate) / 100,
      percentage: commissionRate,
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
