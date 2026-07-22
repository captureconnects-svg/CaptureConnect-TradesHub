import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { PERSISTED_QUERY_KEY_PREFIXES } from "@/lib/query-keys";

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "tradehub-query-cache",
});

// Bump this string whenever a persisted query shape changes to invalidate
// every client's stored cache on next load.
const CACHE_BUSTER = "v1";

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const prefix = query.queryKey[0];
      return (
        typeof prefix === "string" &&
        (PERSISTED_QUERY_KEY_PREFIXES as readonly string[]).includes(prefix) &&
        query.state.status === "success"
      );
    },
  },
};
