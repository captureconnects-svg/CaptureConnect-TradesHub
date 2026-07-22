// Shared platform-settings reader for Edge Functions, backed by a short-lived
// module-scope cache so a warm isolate doesn't hit platform_settings on every
// checkout request. Falls back to safe defaults on any read failure — a
// misconfigured or unreachable settings row must never break payments.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PlatformSettings = {
  clientServiceFeePercent: number;
  proCommissionPercent: number;
  defaultPayoutHoldDays: number;
  platformStatus: "active" | "maintenance";
  version: number;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  clientServiceFeePercent: 6,
  proCommissionPercent: 14,
  defaultPayoutHoldDays: 3,
  platformStatus: "active",
  version: 0,
};

const CACHE_TTL_MS = 30_000;

let cached: PlatformSettings | null = null;
let cachedAt = 0;

export async function getPlatformSettings(admin: SupabaseClient): Promise<PlatformSettings> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const { data, error } = await admin
      .from("platform_settings")
      .select("client_service_fee_percent, pro_commission_percent, default_payout_hold_days, platform_status, version")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      console.error("[platformSettings] failed to load, using defaults:", error);
      return cached ?? DEFAULT_SETTINGS;
    }

    const settings: PlatformSettings = {
      clientServiceFeePercent: Number(data.client_service_fee_percent ?? DEFAULT_SETTINGS.clientServiceFeePercent),
      proCommissionPercent: Number(data.pro_commission_percent ?? DEFAULT_SETTINGS.proCommissionPercent),
      defaultPayoutHoldDays: Number(data.default_payout_hold_days ?? DEFAULT_SETTINGS.defaultPayoutHoldDays),
      platformStatus: (data.platform_status as "active" | "maintenance") ?? DEFAULT_SETTINGS.platformStatus,
      version: Number(data.version ?? DEFAULT_SETTINGS.version),
    };
    cached = settings;
    cachedAt = now;
    return settings;
  } catch (err) {
    console.error("[platformSettings] unexpected error, using defaults:", err);
    return cached ?? DEFAULT_SETTINGS;
  }
}
