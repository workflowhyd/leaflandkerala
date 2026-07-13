import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const isActive = searchParams.get("isActive");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (isActive !== null && isActive !== "") where.isActive = isActive === "true";

  try {
    let [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // If the requested page no longer exists (e.g. the last item on it was
    // just deleted), fall back to the last valid page instead of returning
    // an empty list while matching records still exist.
    if (products.length === 0 && total > 0 && page > 1) {
      const safePage = Math.max(1, Math.ceil(total / limit));
      products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * limit,
        take: limit,
      });
    }

    return NextResponse.json({ products, total, page, limit });
  } catch (err) {
    console.error("[products GET]", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? String(err) : "Database error" },
      { status: 500 }
    );
  }
}

// Products are added directly in the database, not through the app.
export async function POST() {
  return NextResponse.json(
    { error: "Adding products is not available through the app." },
    { status: 403 }
  );
}
