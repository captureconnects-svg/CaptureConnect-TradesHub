import { useQuery } from "@tanstack/react-query";
import { fetchPlatformSettings, type PlatformSettings } from "@/lib/settings/platformSettings";
import { queryKeys } from "@/lib/query-keys";

export function usePlatformSettings() {
  return useQuery<PlatformSettings>({
    queryKey: queryKeys.platformSettings(),
    queryFn: fetchPlatformSettings,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
