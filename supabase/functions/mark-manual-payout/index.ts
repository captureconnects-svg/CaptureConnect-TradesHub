/**
 * mark-manual-payout Edge Function
 *
 * POST /functions/v1/mark-manual-payout
 * Headers: Authorization: Bearer <supabase admin access token>
 * Body: { proId: string }
 *
 * Admin-gated. Marks every one of a pro's payments that are past their
 * escrow hold period, fee-verified, unrefunded, and not yet released as
 * paid out — WITHOUT creating a Stripe transfer. Use this when the admin
 * sends the payout manually (e.g. a bank wire using the pro's stored
 * banking details) instead of releasing it through Stripe Connect.
 *
 * Reuses public.payments_ready_for_payout — the same view release-payout
 * trusts — so the escrow hold-period math (payout_hold_days_used) can't
 * drift between the two payout paths. If nothing is past its hold period
 * yet, this returns a 409 with an explanatory message instead of marking
 * anything paid.
 *
 * stripe_transfer_id is deliberately left null on the updated rows — that's
 * what distinguishes a manually-paid-out payment from a Stripe-released one
 * in the ledger, without needing a new column.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";

interface MarkManualPayoutRequest {
  proId?: string;
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

  let body: MarkManualPayoutRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!body.proId) {
    return jsonResponse({ error: "proId is required." }, 400);
  }

  // A manual payout has nowhere to go without the pro's banking/transfer
  // details on file — refuse before marking anything paid out.
  const { data: bankDetails, error: bankError } = await admin
    .from("tradesperson_banking_details")
    .select("id")
    .eq("tradesperson_id", body.proId)
    .limit(1)
    .maybeSingle();
  if (bankError) {
    return jsonResponse({ error: bankError.message }, 500);
  }
  if (!bankDetails) {
    return jsonResponse(
      { error: "This pro has no banking details on file. A payout cannot be sent until they add bank transfer details." },
      409,
    );
  }

  const { data: ready, error: readyError } = await admin
    .from("payments_ready_for_payout")
    .select("id, actual_payout_amount, estimated_payout_amount")
    .eq("provider_id", body.proId);

  if (readyError) {
    return jsonResponse({ error: readyError.message }, 500);
  }
  if (!ready || ready.length === 0) {
    return jsonResponse(
      {
        error:
          "No payments for this pro are past their escrow hold period yet. They may still be within the hold window, awaiting fee reconciliation, refunded, or already paid out.",
      },
      409,
    );
  }

  const total = ready.reduce(
    (sum, p) => sum + Number(p.actual_payout_amount ?? p.estimated_payout_amount ?? 0),
    0,
  );
  const ids = ready.map((p) => p.id as string);

  const { error: updateError } = await admin
    .from("payments")
    .update({
      payout_status: "released",
      payout_released_at: new Date().toISOString(),
      payout_released_by: authorizedAdmin.userId,
      payout_failure_message: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ count: ids.length, total, paymentIds: ids });
});
