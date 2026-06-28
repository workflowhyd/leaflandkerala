import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { randomUUID } from "crypto";

// Node.js < 22 polyfill
if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = ws;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const now = () => new Date().toISOString();

async function insert<T extends object>(table: string, rows: T | T[]): Promise<T[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await supabase.from(table).insert(arr).select();
  if (error) throw new Error(`Insert "${table}": ${error.message}`);
  return data as T[];
}

async function upsert<T extends object>(table: string, rows: T | T[], onConflict: string): Promise<T[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await supabase.from(table).upsert(arr, { onConflict, ignoreDuplicates: false }).select();
  if (error) throw new Error(`Upsert "${table}": ${error.message}`);
  return data as T[];
}

async function findOrCreateAuthUser(
  email: string, password: string, name: string, role: "ADMIN" | "EMPLOYEE"
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { name, role },
  });
  if (!error && data.user) return data.user.id;

  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return existing.id;

  throw new Error(`Cannot create/find auth user ${email}: ${error?.message}`);
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Pincodes ──────────────────────────────────────────────────────────────
  const pincodeRows = [
    { id: randomUUID(), code: "500037", area: "Kukatpally",   district: "Hyderabad", state: "Telangana", isActive: true, createdAt: now(), updatedAt: now() },
    { id: randomUUID(), code: "500072", area: "Miyapur",      district: "Hyderabad", state: "Telangana", isActive: true, createdAt: now(), updatedAt: now() },
    { id: randomUUID(), code: "500032", area: "Jubilee Hills", district: "Hyderabad", state: "Telangana", isActive: true, createdAt: now(), updatedAt: now() },
  ];
  const pincodes = await upsert("Pincode", pincodeRows, "code");
  console.log("✅ Pincodes");

  // ── Settings ──────────────────────────────────────────────────────────────
  await upsert("CommissionSetting", {
    id: "default", defaultPercentage: 10, minPercentage: 5, maxPercentage: 15, updatedAt: now(),
  }, "id");

  await upsert("CompanyInfo", {
    id: "default", businessName: "LeafLand Kerala", contactNumber: "+91 9876543210",
    email: "info@leaflandkerala.com", gstNumber: "36AABCP1234F1ZK",
    address: "123 Green Valley, Kukatpally, Hyderabad - 500037", updatedAt: now(),
  }, "id");

  await upsert("WhatsAppSetting", { id: "default", isEnabled: false, updatedAt: now() }, "id");
  console.log("✅ Settings");

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminId = await findOrCreateAuthUser("admin@leaflandkerala.com", "Admin@123", "Admin User", "ADMIN");
  await upsert("User", {
    id: adminId, name: "Admin User", email: "admin@leaflandkerala.com",
    role: "ADMIN", isActive: true, createdAt: now(), updatedAt: now(),
  }, "email");
  console.log("✅ Admin user");

  // ── Employee users ────────────────────────────────────────────────────────
  const employeeData = [
    { name: "Rajesh Kumar", email: "rajesh@leaflandkerala.com", mobile: "9876541001", territory: "Kukatpally",    commission: 10 },
    { name: "Priya Sharma", email: "priya@leaflandkerala.com",  mobile: "9876541002", territory: "Miyapur",       commission: 11 },
    { name: "Suresh Reddy", email: "suresh@leaflandkerala.com", mobile: "9876541003", territory: "Jubilee Hills", commission: 9  },
    { name: "Anitha Nair",  email: "anitha@leaflandkerala.com", mobile: "9876541004", territory: "Kukatpally",    commission: 12 },
    { name: "Venkat Rao",   email: "venkat@leaflandkerala.com", mobile: "9876541005", territory: "Miyapur",       commission: 10 },
  ];

  const employees: Array<{ id: string; commissionPercent: number }> = [];
  for (const emp of employeeData) {
    const authId = await findOrCreateAuthUser(emp.email, "Emp@1234", emp.name, "EMPLOYEE");
    await upsert("User", {
      id: authId, name: emp.name, email: emp.email,
      role: "EMPLOYEE", isActive: true, createdAt: now(), updatedAt: now(),
    }, "email");

    const empId = randomUUID();
    await insert("Employee", {
      id: empId, userId: authId, name: emp.name, email: emp.email,
      mobile: emp.mobile, territory: emp.territory, commissionPercent: emp.commission,
      isActive: true, createdAt: now(), updatedAt: now(),
    });
    employees.push({ id: empId, commissionPercent: emp.commission });
  }
  console.log("✅ Employees");

  // ── Products ──────────────────────────────────────────────────────────────
  const productsData = [
    { sku: "SEED001",  name: "Hybrid Tomato Seeds (F1)",        category: "SEEDS",                 price: 250,   stock: 500,  description: "High-yield F1 hybrid tomato seeds suitable for all seasons" },
    { sku: "FERT001",  name: "NPK Fertilizer 19-19-19",         category: "FERTILIZERS",           price: 850,   stock: 200,  description: "Balanced NPK fertilizer for all crops" },
    { sku: "PEST001",  name: "Neem Oil Pesticide 5L",           category: "PESTICIDES",            price: 1200,  stock: 150,  description: "100% organic neem oil pesticide, safe for vegetables" },
    { sku: "ORG001",   name: "Vermicompost Organic 10kg",       category: "ORGANIC_PRODUCTS",      price: 320,   stock: 300,  description: "Premium vermicompost for soil enrichment" },
    { sku: "TOOL001",  name: "Hand Sprayer 16L",                category: "FARMING_TOOLS",         price: 1800,  stock: 80,   description: "Durable pressure sprayer for pesticide application" },
    { sku: "IRRI001",  name: "Drip Irrigation Kit (1 Acre)",   category: "IRRIGATION_SUPPLIES",   price: 8500,  stock: 40,   description: "Complete drip irrigation setup for 1 acre land" },
    { sku: "EQUIP001", name: "Mini Power Tiller",               category: "AGRICULTURAL_EQUIPMENT", price: 45000, stock: 10,  description: "Compact tiller for small farms, 5HP engine" },
    { sku: "SEED002",  name: "Paddy Seeds (Improved Variety)",  category: "SEEDS",                 price: 180,   stock: 1000, description: "High-yield paddy variety, resistant to disease" },
    { sku: "FERT002",  name: "Calcium Nitrate Fertilizer 1kg",  category: "FERTILIZERS",           price: 120,   stock: 400,  description: "Soluble calcium nitrate for fruiting vegetables" },
    { sku: "ORG002",   name: "Organic Pest Repellent Spray 1L", category: "ORGANIC_PRODUCTS",      price: 450,   stock: 120,  description: "Herbal pest repellent, safe for organic farming" },
  ];

  const productRows = productsData.map((p) => ({
    id: randomUUID(), ...p, isActive: true, createdAt: now(), updatedAt: now(),
  }));
  const products = await upsert("Product", productRows, "sku");
  console.log("✅ Products");

  // ── Customers ─────────────────────────────────────────────────────────────
  const customersData = [
    { name: "Ramaiah Goud",    mobile: "9000001001", address: "Plot 12, Kukatpally",       village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "ACTIVE",        interested: "Hybrid Tomato Seeds" },
    { name: "Lakshmi Devi",    mobile: "9000001002", address: "H.No 45, Miyapur",           village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "INTERESTED",    interested: "Drip Irrigation Kit" },
    { name: "Srinivas Rao",    mobile: "9000001003", address: "Flat 3A, Jubilee Hills",     village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "ORDER_PLACED",  interested: "NPK Fertilizer" },
    { name: "Padmavathi",      mobile: "9000001004", address: "Door 89, Kukatpally",        village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "VISITED",       interested: "Neem Oil Pesticide" },
    { name: "Venkata Swamy",   mobile: "9000001005", address: "Colony Road, Miyapur",       village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "FOLLOW_UP",    interested: "Vermicompost" },
    { name: "Chandrakala",     mobile: "9000001006", address: "Main Street, Jubilee Hills", village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "ACTIVE",        interested: "Hand Sprayer" },
    { name: "Narayana Reddy",  mobile: "9000001007", address: "Village Road, Kukatpally",   village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "LEAD",          interested: "Paddy Seeds" },
    { name: "Sumitra Bai",     mobile: "9000001008", address: "Near Temple, Miyapur",       village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "ACTIVE",        interested: "Calcium Nitrate" },
    { name: "Hanumaiah",       mobile: "9000001009", address: "Old Town, Jubilee Hills",    village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "INTERESTED",    interested: "Mini Power Tiller" },
    { name: "Savitri Devi",    mobile: "9000001010", address: "New Layout, Kukatpally",     village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "ACTIVE",        interested: "Organic Pest Repellent" },
    { name: "Ravi Shankar",    mobile: "9000001011", address: "Flat 5B, Miyapur",           village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "VISITED",       interested: "Hybrid Tomato Seeds" },
    { name: "Meenakshi",       mobile: "9000001012", address: "Colony 3, Jubilee Hills",    village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "ORDER_PLACED",  interested: "NPK Fertilizer" },
    { name: "Krishnaswamy",    mobile: "9000001013", address: "Lane 7, Kukatpally",         village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "ACTIVE",        interested: "Drip Irrigation" },
    { name: "Bhagya Lakshmi",  mobile: "9000001014", address: "Sector 4, Miyapur",          village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "INTERESTED",    interested: "Vermicompost" },
    { name: "Tirupati Rao",    mobile: "9000001015", address: "Road 5, Jubilee Hills",      village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "LEAD",          interested: "Hand Sprayer" },
    { name: "Annapurna",       mobile: "9000001016", address: "Block C, Kukatpally",        village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "ACTIVE",        interested: "Paddy Seeds" },
    { name: "Govinda Rao",     mobile: "9000001017", address: "Street 12, Miyapur",         village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "VISITED",       interested: "Neem Oil Pesticide" },
    { name: "Subbamma",        mobile: "9000001018", address: "Phase 2, Jubilee Hills",     village: "Jubilee Hills", district: "Hyderabad", pincode: "500032", status: "FOLLOW_UP",    interested: "Mini Power Tiller" },
    { name: "Rajendra Prasad", mobile: "9000001019", address: "Plot 99, Kukatpally",        village: "Kukatpally",    district: "Hyderabad", pincode: "500037", status: "ACTIVE",        interested: "Hybrid Tomato Seeds" },
    { name: "Vijayalakshmi",   mobile: "9000001020", address: "Flat 8A, Miyapur",           village: "Miyapur",       district: "Hyderabad", pincode: "500072", status: "ORDER_PLACED",  interested: "Drip Irrigation Kit" },
  ];

  const customerRows = customersData.map((c, i) => {
    const pc = pincodes.find((p: { code: string }) => p.code === c.pincode)!;
    const emp = employees[i % employees.length];
    return {
      id: randomUUID(), employeeId: emp.id, name: c.name, mobile: c.mobile,
      address: c.address, village: c.village, district: c.district,
      state: "Telangana", pincode: c.pincode, pincodeId: (pc as { id: string }).id,
      status: c.status, interestedProduct: c.interested,
      createdAt: now(), updatedAt: now(),
    };
  });
  const customers = await insert("Customer", customerRows);
  console.log("✅ Customers");

  // Customer locations
  await insert("CustomerLocation", customers.map((c: { id: string }) => ({
    id: randomUUID(), customerId: c.id,
    latitude: 17.38 + Math.random() * 0.1,
    longitude: 78.45 + Math.random() * 0.1,
    capturedAt: now(), updatedAt: now(),
  })));

  // ── Field visits ──────────────────────────────────────────────────────────
  const visitRows = Array.from({ length: 15 }, (_, i) => {
    const customer = customers[i % customers.length] as { id: string; interestedProduct: string };
    const emp = employees[i % employees.length];
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    return {
      id: randomUUID(), customerId: customer.id, employeeId: emp.id,
      visitDate: d.toISOString(),
      notes: `Visit to discuss ${customer.interestedProduct} requirements`,
      latitude: 17.38 + Math.random() * 0.1,
      longitude: 78.45 + Math.random() * 0.1,
      createdAt: now(),
    };
  });
  await insert("FieldVisit", visitRows);
  console.log("✅ Field visits");

  // ── Orders ────────────────────────────────────────────────────────────────
  const orderStatuses = ["DELIVERED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "PROCESSING", "CONFIRMED", "NEW", "CANCELLED"];

  for (let i = 0; i < 20; i++) {
    const customer = customers[i % customers.length] as { id: string };
    const emp = employees[i % employees.length];
    const p1 = products[i % products.length] as { id: string; price: number };
    const p2 = products[(i + 2) % products.length] as { id: string; price: number };
    const qty1 = Math.floor(Math.random() * 5) + 1;
    const qty2 = Math.floor(Math.random() * 3) + 1;
    const total = p1.price * qty1 + p2.price * qty2;
    const status = orderStatuses[i % orderStatuses.length];
    const pc = pincodes[i % pincodes.length] as { id: string };

    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60));
    const deliveryDate = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    const orderId = randomUUID();
    await insert("Order", {
      id: orderId,
      orderNumber: `LLK${Date.now().toString().slice(-6)}${i.toString().padStart(3, "0")}`,
      customerId: customer.id, employeeId: emp.id, status, totalAmount: total,
      pincodeId: pc.id, deliveryDate: deliveryDate.toISOString(),
      createdAt: orderDate.toISOString(), updatedAt: orderDate.toISOString(),
    });

    await insert("OrderItem", [
      { id: randomUUID(), orderId, productId: p1.id, quantity: qty1, price: p1.price, subtotal: p1.price * qty1 },
      { id: randomUUID(), orderId, productId: p2.id, quantity: qty2, price: p2.price, subtotal: p2.price * qty2 },
    ]);

    const trackingRows = [
      { id: randomUUID(), orderId, status: "NEW", notes: "Order created", createdAt: orderDate.toISOString() },
      ...(status !== "NEW" ? [{ id: randomUUID(), orderId, status: "CONFIRMED", notes: "Order confirmed", createdAt: new Date(orderDate.getTime() + 2 * 3600000).toISOString() }] : []),
      ...(["PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? [{ id: randomUUID(), orderId, status: "PROCESSING", notes: "Being processed", createdAt: new Date(orderDate.getTime() + 5 * 3600000).toISOString() }] : []),
      ...(status === "DELIVERED" ? [{ id: randomUUID(), orderId, status: "DELIVERED", notes: "Successfully delivered", createdAt: new Date(orderDate.getTime() + 86400000).toISOString() }] : []),
    ];
    await insert("OrderTracking", trackingRows);

    await insert("Commission", {
      id: randomUUID(), employeeId: emp.id, orderId,
      amount: (total * emp.commissionPercent) / 100,
      percentage: emp.commissionPercent,
      isPaid: status === "DELIVERED",
      paidAt: status === "DELIVERED" ? now() : null,
      createdAt: now(),
    });
  }

  console.log("✅ Orders");
  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin:    admin@leaflandkerala.com / Admin@123");
  console.log("  Employee: rajesh@leaflandkerala.com / Emp@1234");
}

main().catch((e) => { console.error(e); process.exit(1); });
