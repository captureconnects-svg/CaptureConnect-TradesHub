/**
 * currency-convert Edge Function
 *
 * POST /functions/v1/currency-convert
 * Body: { amount: number, from: "USD" | "JMD", to: "USD" | "JMD" }
 *
 * Proxies to the Frankfurter API and returns a structured conversion result.
 * All booking prices are stored in USD; JMD is display-only.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPPORTED_CURRENCIES = ["USD", "JMD"] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface ConvertRequest {
  amount: number;
  from: SupportedCurrency;
  to: SupportedCurrency;
}

interface ConvertResponse {
  original_amount: number;
  from_currency: SupportedCurrency;
  to_currency: SupportedCurrency;
  converted_amount: number;
  rate: number;
}

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  // ── Parse + validate body ────────────────────────────────────────────────
  let body: ConvertRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const { amount, from, to } = body;

  if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
    return jsonResponse({ error: "amount must be a positive finite number." }, 400);
  }
  if (!isSupportedCurrency(from)) {
    return jsonResponse({ error: `from must be one of: ${SUPPORTED_CURRENCIES.join(", ")}.` }, 400);
  }
  if (!isSupportedCurrency(to)) {
    return jsonResponse({ error: `to must be one of: ${SUPPORTED_CURRENCIES.join(", ")}.` }, 400);
  }
  if (from === to) {
    return jsonResponse<ConvertResponse>({
      original_amount: amount,
      from_currency: from,
      to_currency: to,
      converted_amount: amount,
      rate: 1,
    });
  }

  // ── Call Frankfurter API ─────────────────────────────────────────────────
  const url = `https://api.frankfurter.dev/v1/latest?amount=${amount}&base=${from}&symbols=${to}`;

  let data: FrankfurterResponse;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Frankfurter API error ${res.status}:`, text);
      return jsonResponse({ error: "Exchange rate provider returned an error. Try again later." }, 502);
    }

    data = await res.json();
  } catch (err) {
    console.error("Frankfurter fetch failed:", err);
    return jsonResponse({ error: "Failed to reach exchange rate provider. Try again later." }, 502);
  }

  const converted_amount = data.rates[to];
  if (converted_amount == null) {
    console.error("Unexpected Frankfurter payload – missing rate for", to, data);
    return jsonResponse({ error: "Exchange rate not available for the requested currency pair." }, 502);
  }

  // Derive rate from response: rate = converted / original
  const rate = converted_amount / amount;

  return jsonResponse<ConvertResponse>({
    original_amount: amount,
    from_currency: from,
    to_currency: to,
    converted_amount,
    rate,
  });
});
