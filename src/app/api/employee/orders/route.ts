import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateEmployeeCommission } from "@/lib/commission";

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
      customer: { select: { id: true, name: true, mobile: true, village: true, address: true } },
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

  let body: {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    notes?: string;
    latitude?: number;
    longitude?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { customerId, items, notes, latitude, longitude } = body;

  if (!customerId || !items?.length) {
    return NextResponse.json({ error: "customerId and items are required" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
    if (!employee) return NextResponse.json({ error: "Employee account not found" }, { status: 404 });

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, employeeId: employee.id },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found or does not belong to you" }, { status: 404 });

    // Verify all products exist
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, name: true, price: true, stock: true },
    });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products are unavailable. Please refresh and try again." }, { status: 400 });
    }

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
    }).catch(() => null);

    // Retry up to 3 times to handle rare order-number collisions.
    // Transaction is kept minimal (order + commission + stock) to avoid timeout.
    let order: Awaited<ReturnType<typeof prisma.order.create>> | null = null;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          const created = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              customerId,
              employeeId: employee.id,
              totalAmount,
              notes: notes || null,
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

          const { commissionRate } = await recalculateEmployeeCommission(employee.id, tx);

          await tx.commission.create({
            data: {
              employeeId: employee.id,
              orderId: created.id,
              amount: (totalAmount * commissionRate) / 100,
              percentage: commissionRate,
            },
          });

          await Promise.all(
            orderItems.map((item) =>
              tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              })
            )
          );

          return created;
        }, { timeout: 15000 });
        break; // success — exit retry loop
      } catch (err: unknown) {
        // Retry only on unique constraint violation (P2002 — order number collision)
        const isPrismaUnique =
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "P2002";
        if (isPrismaUnique && attempt < 2) {
          lastError = err;
          continue;
        }
        throw err; // re-throw non-retryable errors
      }
    }

    if (!order) throw lastError;

    // Non-critical side effects run after the transaction commits.
    // Failures here are logged but do not affect the order response.
    await Promise.all([
      prisma.notification.create({
        data: {
          orderId: order.id,
          type: "ORDER_PLACED",
          recipient: customer.mobile,
          message: fillTemplate(
            waSettings?.templateOrderPlaced ??
              "Hello {{Customer Name}}, your order {{Order Number}} has been placed. Delivery on {{Delivery Date}}.",
            {
              "Customer Name": customer.name,
              "Order Number": order.orderNumber,
              "Delivery Date": deliveryDateStr,
            }
          ),
          isSent: false,
        },
      }).catch((e) => console.error("[orders] notification.create failed:", e)),

      latitude && longitude
        ? prisma.customerLocation.upsert({
            where: { customerId },
            update: { latitude, longitude, capturedAt: new Date() },
            create: { customerId, latitude, longitude },
          }).catch((e) => console.error("[orders] customerLocation.upsert failed:", e))
        : Promise.resolve(),

      ["LEAD", "VISITED", "INTERESTED"].includes(customer.status)
        ? prisma.customer.update({
            where: { id: customerId },
            data: { status: "ORDER_PLACED" },
          }).catch((e) => console.error("[orders] customer.update status failed:", e))
        : Promise.resolve(),

      prisma.activityLog.create({
        data: {
          userId: session.userId,
          customerId,
          type: "ORDER_CREATE",
          description: `Order ${order.orderNumber} created for ${customer.name} — ₹${totalAmount.toLocaleString("en-IN")}`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount,
            itemCount: orderItems.length,
            employeeId: employee.id,
            latitude,
            longitude,
          },
        },
      }).catch((e) => console.error("[orders] activityLog ORDER_CREATE failed:", e)),

      latitude && longitude
        ? prisma.activityLog.create({
            data: {
              userId: session.userId,
              customerId,
              type: "CUSTOMER_VISIT",
              description: `GPS captured at ${customer.name}'s location`,
              metadata: { latitude, longitude, orderId: order.id },
            },
          }).catch((e) => console.error("[orders] activityLog CUSTOMER_VISIT failed:", e))
        : Promise.resolve(),
    ]);

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

    const itemList = (order as typeof order & { items: { product: { name: string }; quantity: number }[] })
      .items.map((i) => `• ${i.product.name} x${i.quantity}`).join("\n");
    const adminMessage = `New Order Alert!\n\nOrder: ${order.orderNumber}\nCustomer: ${customer.name} (${customer.mobile})\nAmount: ₹${totalAmount.toLocaleString("en-IN")}\nDelivery: ${deliveryDateStr}\n\nItems:\n${itemList}\n\nEmployee: ${employee.name}`;
    const adminPhone = waSettings?.adminPhone?.replace(/\D/g, "");
    const adminWhatsappUrl = adminPhone
      ? `https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMessage)}`
      : null;

    return NextResponse.json(
      { ...order, deliveryDate, deliveryDateStr, whatsappUrl, whatsappMessage, adminWhatsappUrl },
      { status: 201 }
    );
  } catch (err) {
    console.error("[employee/orders POST] Error:", err);
    const message =
      err &&
      typeof err === "object" &&
      "message" in err
        ? String((err as { message: string }).message)
        : "Unknown error";
    return NextResponse.json(
      { error: `Order could not be saved: ${message}` },
      { status: 500 }
    );
  }
}
