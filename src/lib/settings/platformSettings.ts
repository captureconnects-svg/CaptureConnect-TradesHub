import { supabase } from "@/lib/supabase";
import { requireAdminRole } from "@/backend/admin";
import { validatePlatformSettings } from "@/lib/settings/settingsValidation";
import { recordSettingsChanges, logSettingsAuditEntry } from "@/lib/settings/settingsHistory";

export type PlatformSettings = {
  id: number;
  platformName: string;
  defaultCurrency: string;
  clientServiceFeePercent: number;
  proCommissionPercent: number;
  defaultPayoutHoldDays: number;
  refundWindowDays: number;
  taxEnabled: boolean;
  taxPercent: number;
  platformStatus: "active" | "maintenance";
  version: number;
  updatedAt: string;
  updatedBy: string | null;
};

export type PlatformSettingsInput = Omit<
  PlatformSettings,
  "id" | "version" | "updatedAt" | "updatedBy"
>;

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 1,
  platformName: "Capture Connect",
  defaultCurrency: "USD",
  clientServiceFeePercent: 6,
  proCommissionPercent: 14,
  defaultPayoutHoldDays: 3,
  refundWindowDays: 14,
  taxEnabled: false,
  taxPercent: 0,
  platformStatus: "active",
  version: 1,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

const SELECT_COLUMNS =
  "id, platform_name, default_currency, client_service_fee_percent, pro_commission_percent, default_payout_hold_days, refund_window_days, tax_enabled, tax_percent, platform_status, version, updated_at, updated_by";

function mapRow(data: Record<string, unknown>): PlatformSettings {
  return {
    id: Number(data.id ?? 1),
    platformName: String(data.platform_name ?? DEFAULT_PLATFORM_SETTINGS.platformName),
    defaultCurrency: String(data.default_currency ?? DEFAULT_PLATFORM_SETTINGS.defaultCurrency),
    clientServiceFeePercent: Number(
      data.client_service_fee_percent ?? DEFAULT_PLATFORM_SETTINGS.clientServiceFeePercent,
    ),
    proCommissionPercent: Number(
      data.pro_commission_percent ?? DEFAULT_PLATFORM_SETTINGS.proCommissionPercent,
    ),
    defaultPayoutHoldDays: Number(
      data.default_payout_hold_days ?? DEFAULT_PLATFORM_SETTINGS.defaultPayoutHoldDays,
    ),
    refundWindowDays: Number(data.refund_window_days ?? DEFAULT_PLATFORM_SETTINGS.refundWindowDays),
    taxEnabled: Boolean(data.tax_enabled ?? DEFAULT_PLATFORM_SETTINGS.taxEnabled),
    taxPercent: Number(data.tax_percent ?? DEFAULT_PLATFORM_SETTINGS.taxPercent),
    platformStatus:
      (data.platform_status as "active" | "maintenance") ??
      DEFAULT_PLATFORM_SETTINGS.platformStatus,
    version: Number(data.version ?? DEFAULT_PLATFORM_SETTINGS.version),
    updatedAt: String(data.updated_at ?? DEFAULT_PLATFORM_SETTINGS.updatedAt),
    updatedBy: (data.updated_by as string) ?? null,
  };
}

/** Reads the active platform settings. Falls back to safe defaults if the row is missing or the read fails — this must never break checkout. */
export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select(SELECT_COLUMNS)
      .eq("id", 1)
      .maybeSingle();
    if (!data) return { ...DEFAULT_PLATFORM_SETTINGS };
    return mapRow(data);
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

const FIELD_LABELS: Record<keyof PlatformSettingsInput, string> = {
  platformName: "platform_name",
  defaultCurrency: "default_currency",
  clientServiceFeePercent: "client_service_fee_percent",
  proCommissionPercent: "pro_commission_percent",
  defaultPayoutHoldDays: "default_payout_hold_days",
  refundWindowDays: "refund_window_days",
  taxEnabled: "tax_enabled",
  taxPercent: "tax_percent",
  platformStatus: "platform_status",
};

/**
 * Validates, saves, and audits a full platform settings update. Only admins
 * and super_admins may call this (enforced by requireAdminRole() + RLS).
 * All future payments immediately use the new values; past payments are
 * untouched since they store their own settings snapshot at creation time.
 */
export async function updatePlatformSettings(
  input: PlatformSettingsInput,
  changeReason?: string,
): Promise<PlatformSettings> {
  await requireAdminRole();

  const errors = validatePlatformSettings(input);
  if (errors.length > 0) throw new Error(errors.join(" "));

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const adminId = session?.user?.id ?? null;
  const adminName = session?.user?.email ?? "admin";

  const before = await fetchPlatformSettings();

  const { data, error } = await supabase
    .from("platform_settings")
    .update({
      platform_name: input.platformName,
      default_currency: input.defaultCurrency,
      client_service_fee_percent: input.clientServiceFeePercent,
      pro_commission_percent: input.proCommissionPercent,
      default_payout_hold_days: input.defaultPayoutHoldDays,
      refund_window_days: input.refundWindowDays,
      tax_enabled: input.taxEnabled,
      tax_percent: input.taxPercent,
      platform_status: input.platformStatus,
      updated_by: adminId,
    })
    .eq("id", 1)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("[platformSettings] updatePlatformSettings:", error.message);
    throw new Error("Failed to save platform settings. Please try again.");
  }

  const after = mapRow(data);

  const changes = (Object.keys(FIELD_LABELS) as (keyof PlatformSettingsInput)[])
    .filter((key) => String(before[key]) !== String(after[key]))
    .map((key) => ({
      settingName: FIELD_LABELS[key],
      oldValue: before[key],
      newValue: after[key],
    }));

  await recordSettingsChanges(changes, adminId, changeReason ?? null);
  await logSettingsAuditEntry(changes, adminId, adminName);

  return after;
}
