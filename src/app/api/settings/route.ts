import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [whatsapp, commission, company] = await Promise.all([
    prisma.whatsAppSetting.findFirst(),
    prisma.commissionSetting.findFirst(),
    prisma.companyInfo.findFirst(),
  ]);

  return NextResponse.json({ whatsapp, commission, company });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { type, data } = body;

  if (type === "whatsapp") {
    const existing = await prisma.whatsAppSetting.findFirst();
    const setting = existing
      ? await prisma.whatsAppSetting.update({ where: { id: existing.id }, data })
      : await prisma.whatsAppSetting.create({ data });
    return NextResponse.json(setting);
  }

  if (type === "commission") {
    const existing = await prisma.commissionSetting.findFirst();
    const setting = existing
      ? await prisma.commissionSetting.update({ where: { id: existing.id }, data })
      : await prisma.commissionSetting.create({ data });
    return NextResponse.json(setting);
  }

  if (type === "company") {
    const existing = await prisma.companyInfo.findFirst();
    const setting = existing
      ? await prisma.companyInfo.update({ where: { id: existing.id }, data })
      : await prisma.companyInfo.create({ data });
    return NextResponse.json(setting);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
