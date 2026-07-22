import { useQuery } from "@tanstack/react-query";
import { fetchPageStats, type PageStats } from "@/backend/landing-reviews";
import { queryKeys } from "@/lib/query-keys";

export function useLandingStats() {
  return useQuery<PageStats>({
    queryKey: queryKeys.landingStats(),
    queryFn: fetchPageStats,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });
}
