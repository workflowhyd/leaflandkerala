import { useQuery } from "@tanstack/react-query";
import { fetchProfile, fetchEarnings } from "@/lib/api/profile";

export function useProfile() {
  return useQuery({ queryKey: ["employee", "profile"], queryFn: fetchProfile });
}

export function useEarnings() {
  return useQuery({ queryKey: ["employee", "earnings"], queryFn: fetchEarnings });
}
