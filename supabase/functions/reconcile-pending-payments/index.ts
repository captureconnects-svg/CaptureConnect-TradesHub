/**
 * reconcile-pending-payments Edge Function
 *
 * POST /functions/v1/reconcile-pending-payments
 *
 * Retries Stripe fee reconciliation for every payment in
 * public.payments_awaiting_reconciliation (status='succeeded' but
 * stripe_fee_verified=false — the balance transaction lookup failed or
 * wasn't ready when the webhook first ran). Never estimates: a row that
 * still can't be reconciled just gets its attempt count/error bumped again.
 *
 * Callable two ways:
 *   1. An admin's Supabase session token (Authorization: Bearer ...) — used
 *      by the "Retry Reconciliation" button in the admin dashboard.
 *   2. A `x-cron-secret` header matching the CRON_SECRET secret — for
 *      unattended scheduling via the Supabase Dashboard's Cron UI, the same
 *      way update-exchange-rates is scheduled (see that function's header
 *      comment). Set one up by pointing a scheduled trigger at this
 *      function's URL with that header.
 *
 * Requires the following Supabase secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 *   supabase secrets set CRON_SECRET=<a long random string>
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, type Stripe } from "../_shared/stripe.ts";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";
import { reconcilePayment, buildReconciliationUpdate, describeError } from "../_shared/stripeReconciliation.ts";

const BATCH_SIZE = 25;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server misconfigured." }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const cronHeader = req.headers.get("x-cron-secret");
  const isCron = Boolean(CRON_SECRET) && cronHeader === CRON_SECRET;
  if (!isCron) {
    const authorizedAdmin = await resolveAdmin(admin, req.headers.get("Authorization"));
    if (!authorizedAdmin) {
      return jsonResponse({ error: "Unauthorized: admin role or valid cron secret required." }, 403);
    }
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("[reconcile-pending-payments] Stripe not configured:", err);
    return jsonResponse({ error: "Payments are not configured." }, 500);
  }

  const { data: pending, error: fetchError } = await admin
    .from("payments_awaiting_reconciliation")
    .select("id, stripe_payment_intent_id, service_fee_amount, platform_commission_amount, refund_commission, refunded_amount, estimated_payout_amount, reconciliation_attempts")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[reconcile-pending-payments] failed to load pending payments:", fetchError);
    return jsonResponse({ error: "Failed to load pending payments." }, 500);
  }

  let reconciled = 0;
  let stillFailing = 0;

  for (const payment of pending ?? []) {
    if (!payment.stripe_payment_intent_id) continue;

    try {
      const result = await reconcilePayment(stripe, payment.stripe_payment_intent_id);
      const serviceFeeAmount = payment.service_fee_amount != null ? Number(payment.service_fee_amount) : null;
      const commissionAmount = payment.platform_commission_amount != null ? Number(payment.platform_commission_amount) : null;
      const refundCommission = payment.refund_commission != null ? Number(payment.refund_commission) : null;
      const refundedAmount = payment.refunded_amount != null ? Number(payment.refunded_amount) : null;
      const estimatedPayout = payment.estimated_payout_amount != null ? Number(payment.estimated_payout_amount) : null;

      const { error: updateError } = await admin
        .from("payments")
        .update({
          ...buildReconciliationUpdate(result, { serviceFeeAmount, commissionAmount, refundCommission, refundedAmount, estimatedPayout }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      if (updateError) throw updateError;

      reconciled++;
    } catch (err) {
      const message = describeError(err);
      console.error("[reconcile-pending-payments] retry failed for", payment.id, message);
      await admin
        .from("payments")
        .update({
          reconciliation_attempts: (payment.reconciliation_attempts ?? 0) + 1,
          reconciliation_last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      stillFailing++;
    }
  }

  return jsonResponse({ checked: (pending ?? []).length, reconciled, stillFailing });
});
