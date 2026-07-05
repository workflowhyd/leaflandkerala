export interface CustomerOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  deliveryDate: string | null;
  totalAmount: number;
  status: string;
}

export interface ReturnEligibleItem {
  orderItemId: string;
  productId: string;
  name: string;
  serialNumber: number;
  sku: string;
  orderedQuantity: number;
  returnableQuantity: number;
}

export interface ReturnOrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  deliveryDate: string | null;
  totalAmount: number;
  status: string;
  customer: { id: string; name: string; mobile: string };
  items: ReturnEligibleItem[];
}

export interface MyReturn {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  createdAt: string;
  order: { orderNumber: string };
  customer: { name: string; mobile: string };
  items: { quantity: number; product: { name: string } }[];
}

export interface SubmitReturnInput {
  orderId: string;
  items: { orderItemId: string; productId: string; quantity: number }[];
  reason: string;
  reasonNotes?: string;
  notes?: string;
}

export async function fetchMyReturns(): Promise<MyReturn[]> {
  const res = await fetch("/api/employee/returns");
  if (!res.ok) throw new Error("Failed to load returns");
  return res.json();
}

export async function fetchReturnOrderDetail(orderId: string): Promise<ReturnOrderDetail> {
  const res = await fetch(`/api/employee/returns/orders/${orderId}`);
  if (!res.ok) throw new Error("Failed to load order details");
  return res.json();
}

export async function fetchReturnableOrdersForCustomer(customerId: string): Promise<CustomerOrder[]> {
  const res = await fetch(`/api/employee/returns/orders?customerId=${customerId}`);
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function submitReturn(input: SubmitReturnInput): Promise<{ returnNumber: string }> {
  const res = await fetch("/api/employee/returns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to submit return. Please try again.");
  return data;
}
