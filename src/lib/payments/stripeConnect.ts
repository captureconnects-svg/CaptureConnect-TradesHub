import { supabase } from "@/lib/supabase";
import { invokePaymentsFunction } from "./invokeFunction";
import type { TradespersonStripeAccount } from "./types";

/** The calling pro's own Stripe Connect status — RLS ("Pros can view own Stripe account") scopes this to the caller. Null if the pro hasn't started onboarding yet. */
export async function fetchConnectStatus(proId: string): Promise<TradespersonStripeAccount | null> {
  const { data, error } = await supabase
    .from("tradesperson_stripe_accounts")
    .select("*")
    .eq("id", proId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TradespersonStripeAccount) ?? null;
}

/** Starts (or resumes) Stripe Express onboarding for the calling pro. Returns the URL to redirect to. */
export async function startOnboarding(): Promise<string> {
  const { url } = await invokePaymentsFunction<{ url: string }>("create-connect-account");
  return url;
}
