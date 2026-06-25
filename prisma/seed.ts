import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Pincodes
  const pincodes = await Promise.all([
    prisma.pincode.upsert({
      where: { code: "500037" },
      update: {},
      create: { code: "500037", area: "Kukatpally", district: "Hyderabad", state: "Telangana" },
    }),
    prisma.pincode.upsert({
      where: { code: "500072" },
      update: {},
      create: { code: "500072", area: "Miyapur", district: "Hyderabad", state: "Telangana" },
    }),
    prisma.pincode.upsert({
      where: { code: "500032" },
      update: {},
      create: { code: "500032", area: "Jubilee Hills", district: "Hyderabad", state: "Telangana" },
    }),
  ]);

  console.log("✅ Pincodes created");

  // Commission settings
  await prisma.commissionSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", defaultPercentage: 10, minPercentage: 5, maxPercentage: 15 },
  });

  // Company info
  await prisma.companyInfo.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "LeafLand Kerala",
      contactNumber: "+91 9876543210",
      email: "info@leaflandkerala.com",
      gstNumber: "36AABCP1234F1ZK",
      address: "123 Green Valley, Kukatpally, Hyderabad - 500037",
    },
  });

  // WhatsApp settings
  await prisma.whatsAppSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("✅ Settings created");

  // Admin user
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@leaflandkerala.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@leaflandkerala.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created");

  // Employee users
  const empPassword = await bcrypt.hash("Emp@1234", 12);
  const employeeData = [
    { name: "Rajesh Kumar", email: "rajesh@leaflandkerala.com", mobile: "9876541001", territory: "Kukatpally", commission: 10 },
    { name: "Priya Sharma", email: "priya@leaflandkerala.com", mobile: "9876541002", territory: "Miyapur", commission: 11 },
    { name: "Suresh Reddy", email: "suresh@leaflandkerala.com", mobile: "9876541003", territory: "Jubilee Hills", commission: 9 },
    { name: "Anitha Nair", email: "anitha@leaflandkerala.com", mobile: "9876541004", territory: "Kukatpally", commission: 12 },
    { name: "Venkat Rao", email: "venkat@leaflandkerala.com", mobile: "9876541005", territory: "Miyapur", commission: 10 },
  ];

  const employees = [];
  for (const emp of employeeData) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        name: emp.name,
        email: emp.email,
        password: empPassword,
        role: "EMPLOYEE",
        employee: {
          create: {
            name: emp.name,
            email: emp.email,
            mobile: emp.mobile,
            territory: emp.territory,
            commissionPercent: emp.commission,
          },
        },
      },
      include: { employee: true },
    });
    if (user.employee) employees.push(user.employee);
  }

  console.log("✅ Employees created");

  // Products
  const productsData = [
    { name: "Hybrid Tomato Seeds (F1)", category: "SEEDS" as const, sku: "SEED001", price: 250, stock: 500, description: "High-yield F1 hybrid tomato seeds suitable for all seasons" },
    { name: "NPK Fertilizer 19-19-19", category: "FERTILIZERS" as const, sku: "FERT001", price: 850, stock: 200, description: "Balanced NPK fertilizer for all crops" },
    { name: "Neem Oil Pesticide 5L", category: "PESTICIDES" as const, sku: "PEST001", price: 1200, stock: 150, description: "100% organic neem oil pesticide, safe for vegetables" },
    { name: "Vermicompost Organic 10kg", category: "ORGANIC_PRODUCTS" as const, sku: "ORG001", price: 320, stock: 300, description: "Premium vermicompost for soil enrichment" },
    { name: "Hand Sprayer 16L", category: "FARMING_TOOLS" as const, sku: "TOOL001", price: 1800, stock: 80, description: "Durable pressure sprayer for pesticide application" },
    { name: "Drip Irrigation Kit (1 Acre)", category: "IRRIGATION_SUPPLIES" as const, sku: "IRRI001", price: 8500, stock: 40, description: "Complete drip irrigation setup for 1 acre land" },
    { name: "Mini Power Tiller", category: "AGRICULTURAL_EQUIPMENT" as const, sku: "EQUIP001", price: 45000, stock: 10, description: "Compact tiller for small farms, 5HP engine" },
    { name: "Paddy Seeds (Improved Variety)", category: "SEEDS" as const, sku: "SEED002", price: 180, stock: 1000, description: "High-yield paddy variety, resistant to disease" },
    { name: "Calcium Nitrate Fertilizer 1kg", category: "FERTILIZERS" as const, sku: "FERT002", price: 120, stock: 400, description: "Soluble calcium nitrate for fruiting vegetables" },
    { name: "Organic Pest Repellent Spray 1L", category: "ORGANIC_PRODUCTS" as const, sku: "ORG002", price: 450, stock: 120, description: "Herbal pest repellent, safe for organic farming" },
  ];

  const products = [];
  for (const prod of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
    products.push(product);
  }

  console.log("✅ Products created");

  // Customers
  const customersData = [
    { name: "Ramaiah Goud", mobile: "9000001001", address: "Plot 12, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "ACTIVE" as const, interested: "Hybrid Tomato Seeds" },
    { name: "Lakshmi Devi", mobile: "9000001002", address: "H.No 45, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "INTERESTED" as const, interested: "Drip Irrigation Kit" },
    { name: "Srinivas Rao", mobile: "9000001003", address: "Flat 3A, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "ORDER_PLACED" as const, interested: "NPK Fertilizer" },
    { name: "Padmavathi", mobile: "9000001004", address: "Door 89, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "VISITED" as const, interested: "Neem Oil Pesticide" },
    { name: "Venkata Swamy", mobile: "9000001005", address: "Colony Road, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "FOLLOW_UP" as const, interested: "Vermicompost" },
    { name: "Chandrakala", mobile: "9000001006", address: "Main Street, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "ACTIVE" as const, interested: "Hand Sprayer" },
    { name: "Narayana Reddy", mobile: "9000001007", address: "Village Road, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "LEAD" as const, interested: "Paddy Seeds" },
    { name: "Sumitra Bai", mobile: "9000001008", address: "Near Temple, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "ACTIVE" as const, interested: "Calcium Nitrate" },
    { name: "Hanumaiah", mobile: "9000001009", address: "Old Town, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "INTERESTED" as const, interested: "Mini Power Tiller" },
    { name: "Savitri Devi", mobile: "9000001010", address: "New Layout, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "ACTIVE" as const, interested: "Organic Pest Repellent" },
    { name: "Ravi Shankar", mobile: "9000001011", address: "Flat 5B, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "VISITED" as const, interested: "Hybrid Tomato Seeds" },
    { name: "Meenakshi", mobile: "9000001012", address: "Colony 3, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "ORDER_PLACED" as const, interested: "NPK Fertilizer" },
    { name: "Krishnaswamy", mobile: "9000001013", address: "Lane 7, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "ACTIVE" as const, interested: "Drip Irrigation" },
    { name: "Bhagya Lakshmi", mobile: "9000001014", address: "Sector 4, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "INTERESTED" as const, interested: "Vermicompost" },
    { name: "Tirupati Rao", mobile: "9000001015", address: "Road 5, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "LEAD" as const, interested: "Hand Sprayer" },
    { name: "Annapurna", mobile: "9000001016", address: "Block C, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "ACTIVE" as const, interested: "Paddy Seeds" },
    { name: "Govinda Rao", mobile: "9000001017", address: "Street 12, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "VISITED" as const, interested: "Neem Oil Pesticide" },
    { name: "Subbamma", mobile: "9000001018", address: "Phase 2, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "FOLLOW_UP" as const, interested: "Mini Power Tiller" },
    { name: "Rajendra Prasad", mobile: "9000001019", address: "Plot 99, Kukatpally", village: "Kukatpally", district: "Hyderabad", pincode: "500037", status: "ACTIVE" as const, interested: "Hybrid Tomato Seeds" },
    { name: "Vijayalakshmi", mobile: "9000001020", address: "Flat 8A, Miyapur", village: "Miyapur", district: "Hyderabad", pincode: "500072", status: "ORDER_PLACED" as const, interested: "Drip Irrigation Kit" },
  ];

  const customers = [];
  for (let i = 0; i < customersData.length; i++) {
    const cust = customersData[i];
    const emp = employees[i % employees.length];
    const pc = pincodes.find((p) => p.code === cust.pincode)!;

    const customer = await prisma.customer.create({
      data: {
        name: cust.name,
        mobile: cust.mobile,
        address: cust.address,
        village: cust.village,
        district: cust.district,
        state: "Telangana",
        pincode: cust.pincode,
        pincodeId: pc.id,
        employeeId: emp.id,
        status: cust.status,
        interestedProduct: cust.interested,
        location: {
          create: {
            latitude: 17.38 + Math.random() * 0.1,
            longitude: 78.45 + Math.random() * 0.1,
          },
        },
      },
    });
    customers.push(customer);
  }

  console.log("✅ Customers created");

  // Field Visits
  for (let i = 0; i < 15; i++) {
    const customer = customers[i % customers.length];
    const emp = employees[i % employees.length];
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 30));

    await prisma.fieldVisit.create({
      data: {
        customerId: customer.id,
        employeeId: emp.id,
        visitDate,
        notes: `Visit to discuss ${customer.interestedProduct} requirements`,
        latitude: 17.38 + Math.random() * 0.1,
        longitude: 78.45 + Math.random() * 0.1,
      },
    });
  }

  console.log("✅ Field visits created");

  // Orders
  const orderStatuses = ["DELIVERED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "PROCESSING", "CONFIRMED", "NEW", "CANCELLED"] as const;

  for (let i = 0; i < 20; i++) {
    const customer = customers[i % customers.length];
    const emp = employees[i % employees.length];
    const product1 = products[i % products.length];
    const product2 = products[(i + 2) % products.length];
    const qty1 = Math.floor(Math.random() * 5) + 1;
    const qty2 = Math.floor(Math.random() * 3) + 1;
    const totalAmount = product1.price * qty1 + product2.price * qty2;
    const status = orderStatuses[i % orderStatuses.length];

    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60));

    const order = await prisma.order.create({
      data: {
        orderNumber: `LLK${Date.now().toString().slice(-6)}${i.toString().padStart(3, "0")}`,
        customerId: customer.id,
        employeeId: emp.id,
        status,
        totalAmount,
        deliveryDate: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        pincodeId: pincodes[i % pincodes.length].id,
        createdAt: orderDate,
        items: {
          create: [
            { productId: product1.id, quantity: qty1, price: product1.price, subtotal: product1.price * qty1 },
            { productId: product2.id, quantity: qty2, price: product2.price, subtotal: product2.price * qty2 },
          ],
        },
        tracking: {
          create: [
            { status: "NEW", createdAt: orderDate, notes: "Order created" },
            ...(status !== "NEW" ? [{ status: "CONFIRMED" as const, createdAt: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000), notes: "Order confirmed" }] : []),
            ...(["PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? [{ status: "PROCESSING" as const, createdAt: new Date(orderDate.getTime() + 5 * 60 * 60 * 1000), notes: "Being processed" }] : []),
            ...(status === "DELIVERED" ? [{ status: "DELIVERED" as const, createdAt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000), notes: "Successfully delivered" }] : []),
          ],
        },
        commissions: {
          create: {
            employeeId: emp.id,
            amount: (totalAmount * emp.commissionPercent) / 100,
            percentage: emp.commissionPercent,
            isPaid: status === "DELIVERED",
            paidAt: status === "DELIVERED" ? new Date() : null,
          },
        },
      },
    });
  }

  console.log("✅ Orders created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin: admin@leaflandkerala.com / Admin@123");
  console.log("  Employee: rajesh@leaflandkerala.com / Emp@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
