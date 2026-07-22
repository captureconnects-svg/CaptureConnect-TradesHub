import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTraderReviews,
  fetchTraderRatingStats,
  fetchMyReviews,
} from "@/backend/client-reviews";
import { queryKeys } from "@/lib/query-keys";

export function useTraderReviews(traderId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.reviews.trader(traderId);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [reviews, stats] = await Promise.all([
        fetchTraderReviews(traderId),
        fetchTraderRatingStats(traderId),
      ]);
      return { reviews, avgRating: stats.avgRating, reviewCount: stats.totalReviews };
    },
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  });

  return {
    reviews: query.data?.reviews ?? [],
    avgRating: query.data?.avgRating ?? 0,
    reviewCount: query.data?.reviewCount ?? 0,
    isLoading: query.isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
  };
}

export function useMyReviews(limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.reviews.mine("me"), limit] as const,
    queryFn: () => fetchMyReviews(limit),
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  });
}
