// Shared Stripe client for Edge Functions.
// Deno has no Node http module, so the SDK needs the fetch-based HTTP client.
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

export function getStripeClient(): Stripe {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured as a Supabase secret.");
  }
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    // Stripe's Node SDK schedules a telemetry callback via process.nextTick
    // after each request. Supabase's Edge Runtime doesn't support the
    // microtask draining that requires and crashes the isolate afterward
    // ("Deno.core.runMicrotasks() is not supported in this environment").
    telemetry: false,
  });
}

export type { Stripe };
