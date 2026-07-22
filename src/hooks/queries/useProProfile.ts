import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProProfileData,
  updateProProfileData,
  type EditProfileData,
} from "@/backend/pro-edit-profile";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

const ME = "me";

export function useProProfile(options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const key = queryKeys.proProfile(ME);

  const query = useQuery({
    queryKey: key,
    queryFn: fetchProProfileData,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    enabled: options.enabled,
  });

  const save = useMutation({
    mutationFn: (data: EditProfileData) => updateProProfileData(data),
    onSuccess: async (_result, data) => {
      // Optimistic merge for the pro's own edit screen — no refetch needed there.
      queryClient.setQueryData(key, data);

      // The public trader card and marketplace listings are cached separately
      // (keyed by the pro's actual id / category) and read the same tables
      // this save just wrote to, so clients would otherwise see stale specialty,
      // packages, or visibility until those caches naturally expire.
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.traderCard(authData.user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  return { profile: query.data, isLoading: query.isLoading, saveProfile: save.mutateAsync };
}
