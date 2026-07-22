import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClientProfileData,
  updateClientProfileData,
  fetchClientProfileStats,
  type ClientProfileData,
} from "@/backend/client-edit-profile";
import { queryKeys } from "@/lib/query-keys";

const ME = "me";

export function useClientProfile() {
  const queryClient = useQueryClient();
  const key = queryKeys.clientProfile(ME);

  const query = useQuery({
    queryKey: key,
    queryFn: fetchClientProfileData,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  });

  const save = useMutation({
    mutationFn: (data: ClientProfileData) => updateClientProfileData(data),
    onSuccess: (_result, data) => {
      // Optimistic merge — no refetch needed after a successful edit.
      queryClient.setQueryData(key, data);
    },
  });

  return { profile: query.data, isLoading: query.isLoading, saveProfile: save.mutateAsync };
}

export function useClientProfileStats() {
  return useQuery({
    queryKey: [...queryKeys.clientProfile(ME), "stats"] as const,
    queryFn: fetchClientProfileStats,
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  });
}
