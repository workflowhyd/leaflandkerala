import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminProducts,
  AdminProductListResult,
} from "@/lib/api/products";

export interface UseAdminProductsParams {
  search: string;
  category: string;
  isActive: string;
  page: number;
  limit?: number;
}

export function useAdminProducts({
  search,
  category,
  isActive,
  page,
  limit = 10,
}: UseAdminProductsParams) {
  return useQuery<AdminProductListResult>({
    queryKey: ["admin", "products", { search, category, isActive, page, limit }],
    queryFn: () => fetchAdminProducts({ search, category, isActive, page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateAdminProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
}
