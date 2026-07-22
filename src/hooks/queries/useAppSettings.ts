import { useQuery } from "@tanstack/react-query";
import { getAdminSettings, type AdminSettings } from "@/backend/admin";
import { queryKeys } from "@/lib/query-keys";

export function useAppSettings() {
  return useQuery<AdminSettings>({
    queryKey: queryKeys.appSettings(),
    queryFn: getAdminSettings,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
