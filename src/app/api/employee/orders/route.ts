import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  sat.setHours(23, 59, 59, 999);
  return { weekStart: mon, weekEnd: sat };
}

function generateOrderNumber(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, "g"), v),
    template
  );
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const view = new URL(request.url).searchParams.get("view") ?? "week";
  const { weekStart, weekEnd } = getWeekRange();

  const where =
    view === "week"
      ? { employeeId: employee.id, createdAt: { gte: weekStart, lte: weekEnd } }
      : { employeeId: employee.id };

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true, orderNumber: true, status: true, totalAmount: true,
      notes: true, deliveryDate: true, createdAt: true,
      customer: { select: { id: true, name: true, mobile: true, village: true } },
      items: {
        select: {
          quantity: true, price: true, subtotal: true,
          product: { select: { id: true, name: true, sku: true, serialNumber: true, imageUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: view === "week" ? 50 : 20,
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { customerId, items, notes, latitude, longitude } = body as {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    notes?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!customerId || !items?.length) {
    return NextResponse.json({ error: "customerId and items are required" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, employeeId: employee.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const orderItems = items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    price: i.price,
    subtotal: i.price * i.quantity,
  }));
  const totalAmount = orderItems.reduce((s, i) => s + i.subtotal, 0);

  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const deliveryDate = new Date(now);
  deliveryDate.setDate(now.getDate() + daysUntilSunday);
  deliveryDate.setHours(9, 0, 0, 0);

  const deliveryDateStr = deliveryDate.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const waSettings = await prisma.whatsAppSetting.findFirst({
    select: { isEnabled: true, templateOrderPlaced: true, adminPhone: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        employeeId: employee.id,
        totalAmount,
        notes,
        deliveryDate,
        items: { create: orderItems },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, serialNumber: true } },
          },
        },
        customer: { select: { name: true, mobile: true } },
      },
    });

    // Commission record
    await tx.commission.create({
      data: {
        employeeId: employee.id,
        orderId: created.id,
        amount: (totalAmount * employee.commissionPercent) / 100,
        percentage: employee.commissionPercent,
      },
    });

    // Reduce stock for each item
    await Promise.all(
      orderItems.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    );

    // Notification record
    await tx.notification.create({
      data: {
        orderId: created.id,
        type: "ORDER_PLACED",
        recipient: customer.mobile,
        message: fillTemplate(
          waSettings?.templateOrderPlaced ??
            "Hello {{Customer Name}}, your order {{Order Number}} has been placed. Delivery on {{Delivery Date}}.",
          {
            "Customer Name": customer.name,
            "Order Number": created.orderNumber,
            "Delivery Date": deliveryDateStr,
          }
        ),
        isSent: false,
      },
    });

    // GPS upsert
    if (latitude && longitude) {
      await tx.customerLocation.upsert({
        where: { customerId },
        update: { latitude, longitude, capturedAt: new Date() },
        create: { customerId, latitude, longitude },
      });
    }

    // Customer status upgrade
    if (customer.status === "LEAD" || customer.status === "VISITED" || customer.status === "INTERESTED") {
      await tx.customer.update({
        where: { id: customerId },
        data: { status: "ORDER_PLACED" },
      });
    }

    // Activity log
    await tx.activityLog.create({
      data: {
        userId: session.userId,
        customerId,
        type: "ORDER_CREATE",
        description: `Order ${created.orderNumber} created for ${customer.name} — ₹${totalAmount.toLocaleString("en-IN")}`,
        metadata: {
          orderId: created.id,
          orderNumber: created.orderNumber,
          totalAmount,
          itemCount: orderItems.length,
          employeeId: employee.id,
          latitude,
          longitude,
        },
      },
    });

    // GPS capture activity log
    if (latitude && longitude) {
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          customerId,
          type: "CUSTOMER_VISIT",
          description: `GPS captured at ${customer.name}'s location`,
          metadata: { latitude, longitude, orderId: created.id },
        },
      });
    }

    return created;
  });

  // Build WhatsApp click-to-chat URL
  const whatsappMessage = fillTemplate(
    waSettings?.templateOrderPlaced ??
      "Hello {{Customer Name}},\n\nThank you for your order with LeafLand Kerala.\n\nOrder Number: {{Order Number}}\nExpected Delivery: {{Delivery Date}}\n\nOur team will contact you before delivery.\n\nThank you.",
    {
      "Customer Name": customer.name,
      "Order Number": order.orderNumber,
      "Delivery Date": deliveryDateStr,
    }
  );

  const mobile = customer.mobile.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/91${mobile}?text=${encodeURIComponent(whatsappMessage)}`;

  const itemList = order.items.map((i) => `• ${i.product.name} x${i.quantity}`).join("\n");
  const adminMessage = `New Order Alert!\n\nOrder: ${order.orderNumber}\nCustomer: ${customer.name} (${customer.mobile})\nAmount: ₹${totalAmount.toLocaleString("en-IN")}\nDelivery: ${deliveryDateStr}\n\nItems:\n${itemList}\n\nEmployee: ${employee.name}`;
  const adminPhone = waSettings?.adminPhone?.replace(/\D/g, "");
  const adminWhatsappUrl = adminPhone
    ? `https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMessage)}`
    : null;

  return NextResponse.json(
    {
      ...order,
      deliveryDate,
      deliveryDateStr,
      whatsappUrl,
      whatsappMessage,
      adminWhatsappUrl,
    },
    { status: 201 }
  );
}
