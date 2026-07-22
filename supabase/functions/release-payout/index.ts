/**
 * release-payout Edge Function
 *
 * POST /functions/v1/release-payout
 * Headers: Authorization: Bearer <supabase admin access token>
 * Body: { paymentId: string }
 *
 * Admin-gated: an admin explicitly releases a pro's payout once it's
 * past its escrow hold period (see public.payments_ready_for_payout).
 * This is the only place in the codebase that moves real money to a pro —
 * it uses the Stripe Connect "separate charges and transfers" pattern:
 * the original PaymentIntent charged the platform's own account, and this
 * creates a standalone Transfer to the pro's connected Express account.
 *
 * Requires the following Supabase secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, type Stripe } from "../_shared/stripe.ts";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";

interface ReleasePayoutRequest {
  paymentId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server misconfigured." }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const authorizedAdmin = await resolveAdmin(admin, req.headers.get("Authorization"));
  if (!authorizedAdmin) {
    return jsonResponse({ error: "Unauthorized: admin role required." }, 403);
  }

  let body: ReleasePayoutRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!body.paymentId) {
    return jsonResponse({ error: "paymentId is required." }, 400);
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("[release-payout] Stripe not configured:", err);
    return jsonResponse({ error: "Payments are not configured." }, 500);
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select(
      "id, provider_id, currency, status, stripe_charge_id, stripe_fee_verified, payout_status, refunded_amount, actual_payout_amount, payout_idempotency_key, escrow_started_at, payout_hold_days_used",
    )
    .eq("id", body.paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    return jsonResponse({ error: "Payment not found." }, 404);
  }
  if (payment.status !== "succeeded") {
    return jsonResponse({ error: "Payment has not succeeded — nothing to pay out." }, 409);
  }
  if (payment.payout_status === "released") {
    return jsonResponse({ error: "This payout has already been released." }, 409);
  }
  if (!payment.stripe_fee_verified) {
    return jsonResponse({ error: "Stripe fees have not been reconciled for this payment yet." }, 409);
  }
  if (Number(payment.refunded_amount) > 0) {
    return jsonResponse({ error: "This payment has a refund on it — release the payout manually after review." }, 409);
  }
  if (!(Number(payment.actual_payout_amount) > 0)) {
    return jsonResponse({ error: "No payout amount recorded for this payment." }, 400);
  }
  if (!payment.escrow_started_at) {
    return jsonResponse(
      { error: "This job hasn't been marked completed yet — funds aren't in escrow and can't be released." },
      409,
    );
  }
  const holdDays = Number(payment.payout_hold_days_used ?? 0);
  const releaseAt = new Date(payment.escrow_started_at as string);
  releaseAt.setDate(releaseAt.getDate() + holdDays);
  if (Date.now() < releaseAt.getTime()) {
    return jsonResponse(
      { error: `This payment is still within its ${holdDays}-day escrow hold period (releasable ${releaseAt.toISOString()}).` },
      409,
    );
  }

  const { data: stripeAccount } = await admin
    .from("tradesperson_stripe_accounts")
    .select("stripe_connect_account_id, payouts_enabled")
    .eq("id", payment.provider_id)
    .maybeSingle();

  if (!stripeAccount?.stripe_connect_account_id) {
    return jsonResponse({ error: "This pro has not started Stripe onboarding — payout cannot be released." }, 409);
  }
  if (!stripeAccount.payouts_enabled) {
    return jsonResponse({ error: "This pro has not completed Stripe onboarding — payout cannot be released." }, 409);
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: Math.round(Number(payment.actual_payout_amount) * 100),
        currency: payment.currency,
        destination: stripeAccount.stripe_connect_account_id,
        transfer_group: payment.id,
        ...(payment.stripe_charge_id ? { source_transaction: payment.stripe_charge_id } : {}),
        metadata: { payment_id: payment.id, released_by_admin: authorizedAdmin.userId },
      },
      { idempotencyKey: payment.payout_idempotency_key },
    );

    await admin
      .from("payments")
      .update({
        stripe_transfer_id: transfer.id,
        payout_status: "released",
        payout_released_at: new Date().toISOString(),
        payout_released_by: authorizedAdmin.userId,
        payout_failure_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return jsonResponse({ transferId: transfer.id, status: "released" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe transfer failed.";
    console.error("[release-payout] transfer failed for payment", payment.id, message);
    await admin
      .from("payments")
      .update({ payout_status: "failed", payout_failure_message: message, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return jsonResponse({ error: message }, 502);
  }
});
