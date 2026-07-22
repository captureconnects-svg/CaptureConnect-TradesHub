import type { PlatformSettingsInput } from "@/lib/settings/platformSettings";

const ALLOWED_CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD"] as const;
const ALLOWED_STATUSES = ["active", "maintenance"] as const;

function isPercent(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

function isNonNegativeInt(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

/** Returns a list of human-readable error messages; empty means valid. */
export function validatePlatformSettings(input: PlatformSettingsInput): string[] {
  const errors: string[] = [];

  if (!input.platformName.trim()) {
    errors.push("Platform name is required.");
  }
  if (!ALLOWED_CURRENCIES.includes(input.defaultCurrency as (typeof ALLOWED_CURRENCIES)[number])) {
    errors.push(`Default currency must be one of ${ALLOWED_CURRENCIES.join(", ")}.`);
  }
  if (!isPercent(input.clientServiceFeePercent)) {
    errors.push("Client service fee must be a percentage between 0 and 100.");
  }
  if (!isPercent(input.proCommissionPercent)) {
    errors.push("Professional commission must be a percentage between 0 and 100.");
  }
  if (!isNonNegativeInt(input.defaultPayoutHoldDays) || input.defaultPayoutHoldDays > 90) {
    errors.push("Payout hold must be a whole number of days between 0 and 90.");
  }
  if (!isNonNegativeInt(input.refundWindowDays) || input.refundWindowDays > 365) {
    errors.push("Refund window must be a whole number of days between 0 and 365.");
  }
  if (!ALLOWED_STATUSES.includes(input.platformStatus as (typeof ALLOWED_STATUSES)[number])) {
    errors.push(`Platform status must be one of ${ALLOWED_STATUSES.join(", ")}.`);
  }
  if (input.taxEnabled && !isPercent(input.taxPercent)) {
    errors.push("Tax percentage must be between 0 and 100 when taxes are enabled.");
  }

  return errors;
}
