/**
 * update-exchange-rates Edge Function (scheduled)
 *
 * Called on a cron schedule (e.g. every 6 hours via pg_cron or Supabase cron).
 * Fetches live USD↔JMD rates from Frankfurter and writes them to the
 * public.exchange_rates table.
 *
 * Environment variables required:
 *   SUPABASE_URL             – project URL (auto-injected in Edge Functions)
 *   SUPABASE_SERVICE_ROLE_KEY – service-role key (set in Supabase secrets)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchRate(from: string, to: string): Promise<number> {
  const url = `https://api.frankfurter.dev/v1/latest?amount=1&base=${from}&symbols=${to}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`Frankfurter API returned ${res.status} for ${from}→${to}`);
  }

  const data: FrankfurterResponse = await res.json();
  const rate = data.rates[to];

  if (rate == null) {
    throw new Error(`Rate for ${to} not present in Frankfurter response`);
  }

  return rate;
}

serve(async () => {
  const errors: string[] = [];

  // ── USD → JMD ─────────────────────────────────────────────────────────────
  try {
    const usdToJmd = await fetchRate("USD", "JMD");

    const { error } = await supabase
      .from("exchange_rates")
      .update({ rate: usdToJmd, updated_at: new Date().toISOString() })
      .eq("currency_pair", "USD_JMD");

    if (error) throw error;

    console.log(`[update-exchange-rates] USD_JMD updated to ${usdToJmd}`);
  } catch (err) {
    const msg = `Failed to update USD_JMD: ${(err as Error).message}`;
    console.error("[update-exchange-rates]", msg);
    errors.push(msg);
  }

  // ── JMD → USD ─────────────────────────────────────────────────────────────
  try {
    const jmdToUsd = await fetchRate("JMD", "USD");

    const { error } = await supabase
      .from("exchange_rates")
      .update({ rate: jmdToUsd, updated_at: new Date().toISOString() })
      .eq("currency_pair", "JMD_USD");

    if (error) throw error;

    console.log(`[update-exchange-rates] JMD_USD updated to ${jmdToUsd}`);
  } catch (err) {
    const msg = `Failed to update JMD_USD: ${(err as Error).message}`;
    console.error("[update-exchange-rates]", msg);
    errors.push(msg);
  }

  const success = errors.length === 0;

  return new Response(
    JSON.stringify({
      success,
      updated_at: new Date().toISOString(),
      ...(errors.length > 0 && { errors }),
    }),
    {
      status: success ? 200 : 207,
      headers: { "Content-Type": "application/json" },
    }
  );
});
