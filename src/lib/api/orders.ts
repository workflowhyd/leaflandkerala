import type { FreeGiftSettings } from "@/lib/api/employee";

export interface Product {
  id: string;
  name: string;
  sku: string;
  serialNumber: number;
  price: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  category: string;
}

export interface OrderLineItem {
  quantity: number;
  price: number;
  subtotal: number;
  isGift?: boolean;
  product: { id: string; name: string; sku: string; serialNumber: number; imageUrl?: string | null };
}

export interface GiftPoolItem {
  id: string;
  product: { id: string; name: string; sku: string; serialNumber: number; imageUrl?: string | null; stock: number };
}

export interface EmployeeOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  deliveryDate?: string | null;
  customer: { id: string; name: string; mobile: string; village?: string | null; address: string };
  items: OrderLineItem[];
}

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  deliveryDate: string;
  deliveryDateStr: string;
  whatsappUrl: string;
  whatsappMessage: string;
  adminWhatsappUrl?: string | null;
  customer: { name: string; mobile: string };
}

export interface PlaceOrderInput {
  customerId: string;
  items: { productId: string; quantity: number; price: number }[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  giftProductIds?: string[];
}

export async function fetchOrdersList(view: "week" | "all"): Promise<EmployeeOrderListItem[]> {
  const res = await fetch(`/api/employee/orders?view=${view}`);
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function searchProducts(query: string): Promise<Product[]> {
  const res = await fetch(`/api/employee/products?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search products");
  return res.json();
}

export async function fetchGiftItems(): Promise<GiftPoolItem[]> {
  const res = await fetch("/api/employee/gift-items");
  if (!res.ok) throw new Error("Failed to load gift items");
  return res.json();
}

/** Mirrors src/lib/commission.ts's getGiftChoicesAllowed for client-side eligibility display. */
export function getGiftChoicesAllowed(cartTotal: number, settings: FreeGiftSettings): number {
  if (!settings.enabled) return 0;
  if (cartTotal >= settings.tier2MinAmount) return settings.tier2Choices;
  if (cartTotal >= settings.tier1MinAmount) return settings.tier1Choices;
  return 0;
}

export async function placeOrder(payload: PlaceOrderInput): Promise<PlacedOrder> {
  const res = await fetch("/api/employee/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error ?? "Failed to submit order.") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function updateOrderStatus(
  orderId: string,
  coords: { lat?: number; lng?: number }
): Promise<void> {
  const res = await fetch(`/api/employee/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: coords.lat, longitude: coords.lng }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update status.");
  }
}

async function uploadHousePhotoOnce(customerId: string, orderId: string, imageData: string): Promise<void> {
  const res = await fetch(`/api/employee/customers/${customerId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageData, isFront: false, orderId }),
  });
  if (!res.ok) throw new Error("Upload failed");
}

/** Retries the house-photo upload up to 3 attempts total (upload-reliability retry, not a caching concern). */
export async function uploadHousePhoto(
  customerId: string,
  orderId: string,
  imageData: string,
  attempt = 0
): Promise<boolean> {
  try {
    await uploadHousePhotoOnce(customerId, orderId, imageData);
    return true;
  } catch {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      return uploadHousePhoto(customerId, orderId, imageData, attempt + 1);
    }
    return false;
  }
}
