import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, "g"), v),
    template
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const sundayStart = new Date(now);
  sundayStart.setDate(now.getDate() + daysUntilSunday);
  sundayStart.setHours(0, 0, 0, 0);
  const sundayEnd = new Date(sundayStart);
  sundayEnd.setHours(23, 59, 59, 999);

  const sundayLabel = sundayStart.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  const waSettings = await prisma.whatsAppSetting.findFirst({
    select: { isEnabled: true, templateReminder: true },
  });

  // Find orders for upcoming Sunday that haven't had a reminder sent
  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { gte: sundayStart, lte: sundayEnd },
      status: { notIn: ["DELIVERED", "CANCELLED"] },
      notifications: { none: { type: "DELIVERY_REMINDER" } },
    },
    include: {
      customer: { select: { name: true, mobile: true } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const order of orders) {
    const message = fillTemplate(
      waSettings?.templateReminder ??
        "Dear {{Customer Name}}, your order {{Order Number}} is scheduled for delivery on {{Delivery Date}}. Please ensure someone is available to receive it.",
      {
        "Customer Name": order.customer.name,
        "Order Number": order.orderNumber,
        "Delivery Date": sundayLabel,
      }
    );

    const isSent = waSettings?.isEnabled
      ? await sendWhatsAppMessage(`91${order.customer.mobile.replace(/\D/g, "")}`, message)
      : false;

    await prisma.notification.create({
      data: {
        orderId: order.id,
        type: "DELIVERY_REMINDER",
        recipient: order.customer.mobile,
        message,
        isSent,
        sentAt: isSent ? new Date() : null,
      },
    });

    if (isSent) sent++; else failed++;
  }

  return NextResponse.json({
    processedOrders: orders.length,
    remindersSent: sent,
    remindersPending: failed,
    deliveryDate: sundayLabel,
  });
}
