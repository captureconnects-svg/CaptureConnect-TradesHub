import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMerchandise, type MerchandiseItemWithVariants } from "@/backend/pro-merchandise";
import { queryKeys } from "@/lib/query-keys";

const ME = "me";

export function useMerchandise() {
  const queryClient = useQueryClient();
  const key = queryKeys.merchandise(ME);

  const query = useQuery({
    queryKey: key,
    queryFn: fetchMerchandise,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  function updateCache(updater: (prev: MerchandiseItemWithVariants[]) => MerchandiseItemWithVariants[]) {
    queryClient.setQueryData<MerchandiseItemWithVariants[]>(key, (prev) => updater(prev ?? []));
  }

  return { items: query.data ?? [], isLoading: query.isLoading, updateCache };
}
