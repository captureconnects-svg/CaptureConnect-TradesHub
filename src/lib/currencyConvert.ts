/**
 * Currency conversion utilities for the Trade Connect Hub marketplace.
 *
 * Booking integration rules:
 *   - All booking prices, Stripe amounts, and service fees are stored in USD.
 *   - JMD conversion is for display purposes only.
 *   - The exchange rate used at checkout is saved on the booking record
 *     (exchange_rate_used column) and must never be recalculated after payment.
 */

import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export type SupportedCurrency = "USD" | "JMD";

export interface ConversionResult {
  original_amount: number;
  from_currency: SupportedCurrency;
  to_currency: SupportedCurrency;
  /** The converted monetary value. */
  converted_amount: number;
  /** How many `to_currency` units equal 1 `from_currency` unit. */
  rate: number;
}

// ── Core conversion ────────────────────────────────────────────────────────

/**
 * Converts an amount between USD and JMD via the Supabase Edge Function.
 *
 * @throws {Error} When the Edge Function is unreachable or returns an error.
 */
export async function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency
): Promise<ConversionResult> {
  if (!isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive finite number.");
  }

  // Short-circuit: same currency, no network call needed
  if (from === to) {
    return { original_amount: amount, from_currency: from, to_currency: to, converted_amount: amount, rate: 1 };
  }

  const { data, error } = await supabase.functions.invoke<ConversionResult>("currency-convert", {
    body: { amount, from, to },
  });

  if (error) {
    throw new Error(`currency-convert function error: ${error.message}`);
  }
  if (!data) {
    throw new Error("currency-convert returned an empty response.");
  }

  return data;
}

// ── Formatting ─────────────────────────────────────────────────────────────

/**
 * Formats a monetary amount as a localised currency string.
 *
 * USD → en-US locale  (e.g. $1,250.00)
 * JMD → en-JM locale  (e.g. J$1,250.00)
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const locale = currency === "USD" ? "en-US" : "en-JM";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for environments where en-JM locale is unsupported
    const symbol = currency === "USD" ? "$" : "J$";
    return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// ── Exchange rate helpers ──────────────────────────────────────────────────

/**
 * Reads the latest cached exchange rate from the public.exchange_rates table.
 * Returns null if the table is empty or the pair is missing.
 */
export async function getCachedRate(
  from: SupportedCurrency,
  to: SupportedCurrency
): Promise<{ rate: number; updated_at: string } | null> {
  if (from === to) return { rate: 1, updated_at: new Date().toISOString() };

  const pair = `${from}_${to}`;

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate, updated_at")
    .eq("currency_pair", pair)
    .single();

  if (error || !data) return null;
  return data as { rate: number; updated_at: string };
}
