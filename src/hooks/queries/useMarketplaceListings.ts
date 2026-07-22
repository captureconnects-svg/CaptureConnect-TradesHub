import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/backend/client-trader-profile";
import { queryKeys } from "@/lib/query-keys";

export function useMarketplaceListings(categorySlug?: string) {
  return useQuery({
    queryKey: queryKeys.listings(categorySlug),
    queryFn: () => fetchMarketplaceListings(categorySlug),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}
