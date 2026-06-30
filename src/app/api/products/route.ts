import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2),
  category: z.enum([
    "SEEDS", "FERTILIZERS", "PESTICIDES", "ORGANIC_PRODUCTS",
    "FARMING_TOOLS", "IRRIGATION_SUPPLIES", "AGRICULTURAL_EQUIPMENT",
    "MANGO", "JACKFRUIT", "COCONUT", "SPICES", "ORNAMENTAL_PALMS",
    "FLOWERS", "INDOOR_PLANTS", "ORNAMENTAL_PLANTS", "TIMBER_TREES",
    "FRUIT_PLANTS", "GROW_SUPPLIES",
  ]),
  description: z.string().optional(),
  price: z.number().positive(),
  salePrice: z.number().positive().optional().nullable(),
  sku: z.string().min(2),
  stock: z.number().int().min(0),
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

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
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total, page, limit });
  } catch (err) {
    console.error("[products GET]", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? String(err) : "Database error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) {
    return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  const product = await prisma.product.create({ data: parsed.data });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      type: "PRODUCT_CREATE",
      description: `Created product: ${product.name}`,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
