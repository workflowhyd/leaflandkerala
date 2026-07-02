import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFreeGiftSettings } from "@/lib/commission";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const settings = await getFreeGiftSettings();
  return NextResponse.json(settings);
}
