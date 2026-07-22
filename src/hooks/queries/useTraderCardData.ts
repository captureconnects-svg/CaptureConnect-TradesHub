import { useQuery } from "@tanstack/react-query";
import { fetchTraderCardData } from "@/backend/client-trader-profile";
import { queryKeys } from "@/lib/query-keys";

export const TRADER_CARD_STALE_TIME = 2 * 60_000;

export function useTraderCardData(tradespersonId: string) {
  return useQuery({
    queryKey: queryKeys.traderCard(tradespersonId),
    queryFn: () => fetchTraderCardData(tradespersonId),
    staleTime: TRADER_CARD_STALE_TIME,
    gcTime: 30 * 60_000,
  });
}
