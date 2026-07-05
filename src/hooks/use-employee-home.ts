import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchHome, fetchOffers, fetchCashout, requestCashout, markRewardNotified, fetchFreeGift,
} from "@/lib/api/employee";

export function useEmployeeHome() {
  return useQuery({ queryKey: ["employee", "home"], queryFn: fetchHome });
}

export function useEmployeeOffers() {
  return useQuery({
    queryKey: ["employee", "offers"],
    queryFn: fetchOffers,
    staleTime: Infinity,
  });
}

export function useCashoutEligibility() {
  return useQuery({
    queryKey: ["employee", "cashout"],
    queryFn: fetchCashout,
    select: (d) => d.eligibility,
  });
}

export function useCashoutHistory() {
  return useQuery({
    queryKey: ["employee", "cashout"],
    queryFn: fetchCashout,
    select: (d) => d.history,
  });
}

export function useRequestCashout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestCashout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "cashout"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "home"] });
    },
  });
}

export function useMarkRewardsNotified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardIds: string[]) => {
      for (const id of rewardIds) await markRewardNotified(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "offers"] });
    },
  });
}

export function useFreeGift() {
  return useQuery({
    queryKey: ["employee", "free-gift"],
    queryFn: fetchFreeGift,
    staleTime: Infinity,
  });
}
