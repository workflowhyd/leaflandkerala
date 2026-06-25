import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "sales";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  if (type === "sales") {
    const orders = await prisma.order.findMany({
      where: { createdAt: Object.keys(dateFilter).length ? dateFilter : undefined },
      include: {
        customer: { select: { name: true } },
        employee: { select: { name: true } },
        items: { include: { product: { select: { name: true, category: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({ orders, totalRevenue });
  }

  if (type === "products") {
    const products = await prisma.product.findMany({
      include: {
        orderItems: {
          include: { order: { select: { status: true, createdAt: true } } },
        },
      },
    });

    const productStats = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      totalSold: p.orderItems.reduce((sum, i) => sum + i.quantity, 0),
      revenue: p.orderItems
        .filter((i) => i.order.status === "DELIVERED")
        .reduce((sum, i) => sum + i.subtotal, 0),
    }));

    return NextResponse.json(productStats);
  }

  if (type === "employees") {
    const employees = await prisma.employee.findMany({
      include: {
        orders: { select: { totalAmount: true, status: true, createdAt: true } },
        customers: { select: { id: true, createdAt: true } },
        fieldVisits: { select: { id: true } },
        commissions: { select: { amount: true, isPaid: true } },
      },
    });

    const stats = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      mobile: emp.mobile,
      ordersCount: emp.orders.length,
      revenue: emp.orders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      customersAdded: emp.customers.length,
      visitsCount: emp.fieldVisits.length,
      commission: emp.commissions.reduce((sum, c) => sum + c.amount, 0),
    }));

    return NextResponse.json(stats);
  }

  if (type === "customers") {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }).reverse();

    const growthData = await Promise.all(
      months.map(async ({ year, month }) => {
        const count = await prisma.customer.count({
          where: {
            createdAt: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
          },
        });
        return { month: `${year}-${month.toString().padStart(2, "0")}`, count };
      })
    );

    return NextResponse.json(growthData);
  }

  if (type === "visits") {
    const visits = await prisma.fieldVisit.findMany({
      include: {
        employee: { select: { name: true } },
        customer: {
          select: {
            name: true,
            status: true,
            orders: { select: { id: true } },
          },
        },
      },
      orderBy: { visitDate: "desc" },
      take: 100,
    });

    const visitsWithConversion = visits.map((v) => ({
      id: v.id,
      employee: v.employee.name,
      customer: v.customer.name,
      customerStatus: v.customer.status,
      visitDate: v.visitDate,
      converted: v.customer.orders.length > 0,
      ordersCount: v.customer.orders.length,
    }));

    return NextResponse.json(visitsWithConversion);
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
