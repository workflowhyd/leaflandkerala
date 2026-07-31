export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  sku: string;
  stock: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminProductListResult {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminProductListParams {
  search?: string;
  category?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export async function fetchAdminProducts(
  params: AdminProductListParams
): Promise<AdminProductListResult> {
  const qs = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) qs.set("search", params.search);
  if (params.category) qs.set("category", params.category);
  if (params.isActive) qs.set("isActive", params.isActive);

  const res = await fetch(`/api/products?${qs.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Failed to fetch products");
  return data;
}
