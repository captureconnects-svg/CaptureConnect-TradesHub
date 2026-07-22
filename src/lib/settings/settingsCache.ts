import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Forces the browser's platform-settings cache to refetch immediately after
 * an admin save, instead of waiting out usePlatformSettings' staleTime.
 * (The cache that actually matters for checkout throughput lives server-side
 * in supabase/functions/_shared/platformSettings.ts — this just keeps the
 * admin UI itself in sync after a save.)
 */
export function invalidatePlatformSettingsCache(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings() });
}
