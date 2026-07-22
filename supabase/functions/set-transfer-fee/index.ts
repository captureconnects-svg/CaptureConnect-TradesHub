/**
 * set-transfer-fee Edge Function
 *
 * POST /functions/v1/set-transfer-fee
 * Headers: Authorization: Bearer <supabase admin access token>
 * Body: { paymentId: string, transferFees: number }
 *
 * Admin-gated. Records the fee the admin was actually charged by the
 * transfer provider when sending a pro's payout — only knowable after the
 * transfer has gone out, so this is a manual entry rather than something
 * computed at release time. Stamps net_final_revenue = final_revenue -
 * transferFees alongside it in the same update so the two never drift
 * apart. Only allowed once payout_status = 'released' for this payment.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";

interface SetTransferFeeRequest {
  paymentId?: string;
  transferFees?: number;
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

  let body: SetTransferFeeRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!body.paymentId) {
    return jsonResponse({ error: "paymentId is required." }, 400);
  }
  const transferFees = Number(body.transferFees);
  if (!Number.isFinite(transferFees) || transferFees < 0) {
    return jsonResponse({ error: "transferFees must be a non-negative number." }, 400);
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, payout_status, final_revenue")
    .eq("id", body.paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    return jsonResponse({ error: "Payment not found." }, 404);
  }
  if (payment.payout_status !== "released") {
    return jsonResponse({ error: "Transfer fees can only be recorded after the payout has been released." }, 409);
  }

  const netFinalRevenue = Number(payment.final_revenue ?? 0) - transferFees;

  const { error: updateError } = await admin
    .from("payments")
    .update({
      transfer_fees: transferFees,
      net_final_revenue: netFinalRevenue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ transferFees, netFinalRevenue });
});
