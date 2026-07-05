import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOrdersList, searchProducts, placeOrder, updateOrderStatus } from "@/lib/api/orders";

export function useOrdersList(view: "week" | "all", enabled = true) {
  return useQuery({
    queryKey: ["employee", "orders", { view }],
    queryFn: () => fetchOrdersList(view),
    enabled,
  });
}

export function useProductSearch(term: string) {
  return useQuery({
    queryKey: ["employee", "products", "search", term],
    queryFn: () => searchProducts(term),
    staleTime: 30_000,
  });
}

function invalidateAfterOrderChange(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["employee", "orders"] });
  queryClient.invalidateQueries({ queryKey: ["employee", "home"] });
  queryClient.invalidateQueries({ queryKey: ["employee", "cashout"] });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => invalidateAfterOrderChange(queryClient),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, coords }: { orderId: string; coords: { lat?: number; lng?: number } }) =>
      updateOrderStatus(orderId, coords),
    onSuccess: () => invalidateAfterOrderChange(queryClient),
  });
}
