import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/api/auth";

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });
}
