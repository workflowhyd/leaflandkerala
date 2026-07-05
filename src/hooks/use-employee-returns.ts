import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyReturns, fetchReturnOrderDetail, fetchReturnableOrdersForCustomer, submitReturn,
} from "@/lib/api/returns";

export function useMyReturns(enabled = true) {
  return useQuery({ queryKey: ["employee", "returns"], queryFn: fetchMyReturns, enabled });
}

export function useReturnOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["employee", "returns", "order", orderId],
    queryFn: () => fetchReturnOrderDetail(orderId!),
    enabled: !!orderId,
  });
}

export function useReturnableOrders(customerId: string | null) {
  return useQuery({
    queryKey: ["employee", "returns", "customer-orders", customerId],
    queryFn: () => fetchReturnableOrdersForCustomer(customerId!),
    enabled: !!customerId,
  });
}

export function useSubmitReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "returns"] });
    },
  });
}
