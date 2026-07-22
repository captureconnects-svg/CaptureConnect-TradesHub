/**
 * Centralized React Query key factory.
 *
 * Every top-level key here is intentionally cacheable/persistable data
 * (profile, listings, reviews, portfolios, merchandise, settings, likes).
 * Sensitive/fast-changing data (auth, conversations, notifications, bookings,
 * admin data) is deliberately NOT keyed here and must never be added — it
 * should keep using plain fetches, not react-query.
 */
export const queryKeys = {
  appSettings: () => ["appSettings"] as const,

  // Not in PERSISTED_QUERY_KEY_PREFIXES on purpose: platform fees must never
  // be shown from a stale localStorage copy, so this always refetches live.
  platformSettings: () => ["platformSettings"] as const,

  landingStats: () => ["landingStats"] as const,

  clientProfile: (uid: string) => ["clientProfile", uid] as const,
  proProfile: (uid: string) => ["proProfile", uid] as const,

  traderCard: (id: string) => ["traderCard", id] as const,

  listings: (categorySlug?: string) => ["listings", categorySlug ?? "all"] as const,

  reviews: {
    trader: (id: string) => ["reviews", "trader", id] as const,
    mine: (uid: string) => ["reviews", "mine", uid] as const,
    ratingStats: (ids: string[]) => ["reviews", "ratingStats", [...ids].sort()] as const,
  },

  portfolios: (uid: string) => ["portfolios", uid] as const,

  merchandise: (uid: string) => ["merchandise", uid] as const,

  likes: (uid: string) => ["likes", uid] as const,
};

/** Top-level query-key prefixes allowed to be written to persisted (localStorage) cache. */
export const PERSISTED_QUERY_KEY_PREFIXES = [
  "appSettings",
  "landingStats",
  "clientProfile",
  "proProfile",
  "traderCard",
  "listings",
  "reviews",
  "portfolios",
  "merchandise",
  "likes",
] as const;
