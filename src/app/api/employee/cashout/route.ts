import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCashoutEligibility } from "@/lib/cashout";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [eligibility, history] = await Promise.all([
    getCashoutEligibility(employee.id),
    prisma.employeeCashout.findMany({
      where: { employeeId: employee.id },
      orderBy: { weekStartDate: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ eligibility, history });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: session.userId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await getCashoutEligibility(employee.id);
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: eligibility.reasons[0] ?? "Not eligible for cash-out", reasons: eligibility.reasons },
      { status: 400 }
    );
  }

  try {
    const cashout = await prisma.employeeCashout.create({
      data: {
        employeeId: employee.id,
        weekStartDate: eligibility.weekStart,
        weekEndDate: eligibility.weekEnd,
        weeklySales: eligibility.weeklySales,
        commissionRate: eligibility.commissionRate,
        commissionAmount: eligibility.commissionAmount,
        status: "PENDING",
      },
    });

    const weekLabel = `${eligibility.weekStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${eligibility.weekEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        type: "CASHOUT_REQUEST",
        description: `${employee.name} requested a cash-out of ₹${eligibility.commissionAmount.toLocaleString("en-IN")} for the week of ${weekLabel}`,
        metadata: { cashoutId: cashout.id, employeeId: employee.id, weeklySales: eligibility.weeklySales, commissionAmount: eligibility.commissionAmount },
      },
    }).catch((e) => console.error("[employee/cashout] activityLog create failed:", e));

    // Notify admin — WhatsApp if configured, always logged as a Notification record.
    const waSettings = await prisma.whatsAppSetting.findFirst({ select: { isEnabled: true, adminPhone: true } }).catch(() => null);
    const message = `New Cash-Out Request\nEmployee: ${employee.name}\nWeek: ${weekLabel}\nCommission: ₹${eligibility.commissionAmount.toLocaleString("en-IN")}\nStatus: Pending`;
    const isSent = waSettings?.isEnabled && waSettings.adminPhone
      ? await sendWhatsAppMessage(waSettings.adminPhone, message)
      : false;

    await prisma.notification.create({
      data: {
        type: "CASHOUT_REQUEST",
        recipient: waSettings?.adminPhone || "admin",
        message,
        isSent,
        sentAt: isSent ? new Date() : null,
      },
    }).catch((e) => console.error("[employee/cashout] notification create failed:", e));

    return NextResponse.json(cashout, { status: 201 });
  } catch (err: unknown) {
    const isPrismaUnique = err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      return NextResponse.json({ error: "Cash-out already requested for this week" }, { status: 409 });
    }
    console.error("[employee/cashout POST] Error:", err);
    return NextResponse.json({ error: "Failed to submit cash-out request" }, { status: 500 });
  }
}
