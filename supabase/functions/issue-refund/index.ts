/**
 * issue-refund Edge Function
 *
 * POST /functions/v1/issue-refund
 * Headers: Authorization: Bearer <supabase admin access token>
 * Body: { bookingId: string, amount?: number } | { orderId: number, amount?: number }
 *
 * Admin-gated: issues a real Stripe refund for a booking/order's payment.
 * `amount`, if provided (a partial refund — see return_request.partial_amount),
 * must be > 0 and <= base_amount; refunds that exact amount. Omitted (or a
 * full refund), it defaults to the full base_amount. Either way, the
 * platform's service fee is never refunded to the client (see
 * create-payment-intent, which charges base_amount + service fee as one
 * PaymentIntent; only the base_amount portion — in full or in part — comes
 * back out here). This intentionally does NOT write any
 * payments/client_bookings/client_shopping state itself — the
 * `charge.refunded` event Stripe fires immediately after this succeeds is
 * what stripe-webhook's handleChargeRefunded reacts to (single source of
 * truth for refund state, same pattern as create-payment-intent not
 * marking anything "paid" itself — the payment_intent.succeeded webhook
 * does that). handleChargeRefunded is also what decides, from the refunded
 * amount vs. base_amount, whether the platform's commission is forfeited
 * (full refund) or still collected in full with only the pro's payout
 * reduced (partial refund).
 *
 * Requires the following Supabase secret:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, type Stripe } from "../_shared/stripe.ts";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";

interface IssueRefundRequest {
  bookingId?: string;
  orderId?: number;
  /** Partial refund amount in dollars. Omit for a full base_amount refund. */
  amount?: number;
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

  let body: IssueRefundRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!body.bookingId && body.orderId == null) {
    return jsonResponse({ error: "bookingId or orderId is required." }, 400);
  }
  if (body.bookingId && body.orderId != null) {
    return jsonResponse({ error: "Provide only one of bookingId or orderId." }, 400);
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("[issue-refund] Stripe not configured:", err);
    return jsonResponse({ error: "Payments are not configured." }, 500);
  }

  // A booking/order can accumulate more than one `payments` row over multiple
  // checkout attempts (e.g. an earlier PaymentIntent expired/failed and
  // resolveClientSecret minted a fresh one) — only one of them ever reaches
  // "succeeded". Filter on status here instead of using maybeSingle() against
  // the unfiltered set, which errors out (and gets reported as "not found")
  // as soon as a booking/order has more than one payments row.
  const query = admin
    .from("payments")
    .select("id, stripe_payment_intent_id, base_amount, status, refunded_amount")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: payments, error: paymentError } = body.bookingId
    ? await query.eq("booking_id", body.bookingId)
    : await query.eq("order_id", body.orderId as number);

  const payment = payments?.[0] ?? null;
  if (paymentError || !payment) {
    return jsonResponse({ error: "Payment not found." }, 404);
  }
  if (Number(payment.refunded_amount) > 0) {
    return jsonResponse({ error: "This payment has already been refunded." }, 409);
  }
  const baseAmount = Number(payment.base_amount ?? 0);
  if (!(baseAmount > 0)) {
    return jsonResponse({ error: "No base amount recorded for this payment — cannot determine refund amount." }, 400);
  }

  let refundAmount = baseAmount;
  if (body.amount != null) {
    if (!(body.amount > 0)) {
      return jsonResponse({ error: "amount must be greater than 0." }, 400);
    }
    if (body.amount > baseAmount) {
      return jsonResponse({ error: "amount cannot exceed the booking/order's base amount." }, 400);
    }
    refundAmount = body.amount;
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id as string,
      // Only ever the base amount, in full or in part — the service fee is
      // never refunded.
      amount: Math.round(refundAmount * 100),
      metadata: { payment_id: payment.id, issued_by_admin: authorizedAdmin.userId },
    });

    return jsonResponse({ refundId: refund.id, status: refund.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe refund failed.";
    console.error("[issue-refund] refund failed for payment", payment.id, message);
    return jsonResponse({ error: message }, 502);
  }
});
