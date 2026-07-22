import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClientLikes, toggleClientLike } from "@/backend/client-likes";
import { queryKeys } from "@/lib/query-keys";

export function useLikes(clientId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.likes(clientId ?? ""),
    queryFn: () => fetchClientLikes(clientId as string),
    enabled: !!clientId,
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  });

  const toggle = useMutation({
    mutationFn: ({ tradespersonId, currentlyLiked }: { tradespersonId: string; currentlyLiked: boolean }) =>
      toggleClientLike(clientId as string, tradespersonId, currentlyLiked),
    onMutate: async ({ tradespersonId, currentlyLiked }) => {
      if (!clientId) return;
      const key = queryKeys.likes(clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      const next = currentlyLiked
        ? previous.filter((id) => id !== tradespersonId)
        : [...previous, tradespersonId];
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (!clientId || !context) return;
      queryClient.setQueryData(queryKeys.likes(clientId), context.previous);
    },
  });

  return {
    liked: query.data ?? [],
    isLoading: query.isLoading,
    toggleLike: (tradespersonId: string, currentlyLiked: boolean) =>
      toggle.mutate({ tradespersonId, currentlyLiked }),
  };
}
