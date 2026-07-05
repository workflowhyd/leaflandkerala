import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { searchCustomers, createCustomer } from "@/lib/api/customers";

/** Shared across the Orders, Customers, and Returns wizards so identical search terms hit one cache entry. */
export function useCustomerSearch(term: string, enabled = true) {
  return useQuery({
    queryKey: ["employee", "customers", "search", term],
    queryFn: () => searchCustomers(term),
    staleTime: 30_000,
    enabled,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "customers", "search"] });
    },
  });
}
