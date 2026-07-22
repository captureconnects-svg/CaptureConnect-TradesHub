/**
 * payments.ts — frontend entry point for the Stripe payment flow.
 *
 * All Stripe-sensitive work (amount calculation, PaymentIntent creation,
 * the secret key) lives in the create-payment-intent Edge Function. This
 * file only asks that function for a client_secret and hands it to Stripe
 * Elements — it never sees or sends a price.
 */
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export type CreatePaymentIntentTarget = { bookingId: string } | { orderId: number };

export async function createPaymentIntent(target: CreatePaymentIntentTarget): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${FUNCTIONS_URL}/create-payment-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(target),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to start payment.");
  }

  return body.client_secret as string;
}
