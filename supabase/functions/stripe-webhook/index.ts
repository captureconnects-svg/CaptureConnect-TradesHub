/**
 * stripe-webhook Edge Function
 *
 * POST /functions/v1/stripe-webhook
 * Header: stripe-signature (set by Stripe, verified against STRIPE_WEBHOOK_SECRET)
 *
 * Handles:
 *   - payment_intent.succeeded   → marks the booking/order paid, notifies both parties
 *   - payment_intent.payment_failed → notifies the client, records the failure
 *   - charge.refunded            → updates refund state, notifies both parties
 *   - checkout.session.completed → resolves the underlying PaymentIntent and
 *                                   re-uses the payment_intent.succeeded path
 *                                   (only relevant if Checkout Sessions are used
 *                                   instead of the create-payment-intent flow)
 *
 * Idempotency: every Stripe event id is recorded in stripe_webhook_events
 * before processing; a duplicate delivery (Stripe retries on timeout/5xx) is
 * acknowledged without reprocessing. Each handler additionally checks the
 * current DB state before mutating it, so even two *different* event ids for
 * the same underlying payment (e.g. checkout.session.completed firing
 * alongside payment_intent.succeeded) cannot double-charge state or double-send
 * emails.
 *
 * Requires the following Supabase secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, type Stripe } from "../_shared/stripe.ts";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { reconcilePayment, buildReconciliationUpdate, describeError } from "../_shared/stripeReconciliation.ts";
import {
  adminClient,
  notifyUser,
  APP_URL,
  buildPaymentReceivedClientEmail,
  buildPaymentReceivedProEmail,
  buildPaymentReceivedPendingCompletionProEmail,
  buildPaymentFailedEmail,
  buildRefundProcessedClientEmail,
  buildRefundProcessedProEmail,
} from "../_shared/emails.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    console.error("[stripe-webhook] missing signature header or STRIPE_WEBHOOK_SECRET secret");
    return jsonResponse({ error: "Webhook not configured." }, 500);
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("[stripe-webhook] Stripe not configured:", err);
    return jsonResponse({ error: "Payments are not configured." }, 500);
  }

  // Signature verification needs the raw, unparsed body.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return jsonResponse({ error: "Invalid signature." }, 400);
  }

  const admin = adminClient();

  // ── Idempotency ────────────────────────────────────────────────────────
  const { error: dedupeError } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (dedupeError) {
    if ((dedupeError as { code?: string }).code === "23505") {
      // Already processed this exact event id — ack and stop.
      return jsonResponse({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] failed to record event id (continuing anyway):", dedupeError);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(admin, stripe, event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(admin, event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(admin, event.data.object as Stripe.Charge);
        break;
      case "account.updated":
        await handleAccountUpdated(admin, event.data.object as Stripe.Account);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (session.payment_status === "paid" && paymentIntentId) {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          await handlePaymentSucceeded(admin, stripe, pi);
        }
        break;
      }
      default:
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] error processing ${event.type}:`, err);
    // 500 tells Stripe to retry the delivery.
    return jsonResponse({ error: "Webhook handler failed." }, 500);
  }

  return jsonResponse({ received: true });
});

// ── payment_intent.succeeded ────────────────────────────────────────────────

async function handlePaymentSucceeded(admin: SupabaseClient, stripe: Stripe, pi: Stripe.PaymentIntent): Promise<void> {
  const chargeId = extractChargeId(pi);
  const amountPaid = (pi.amount_received || pi.amount) / 100;

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, order_id, status, service_fee_amount, platform_commission_amount, refund_commission, estimated_payout_amount, reconciliation_attempts")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();

  const bookingId: string | null = payment?.booking_id ?? (pi.metadata?.bookingId || null);
  const orderId: number | null = payment?.order_id ?? (pi.metadata?.orderId ? Number(pi.metadata.orderId) : null);

  // Escrow normally starts when the booking/order is later marked completed
  // (see payments_escrow_start.sql's triggers). This covers the reverse,
  // rarer ordering: a pro already marked the job completed before the
  // client's payment settled — in that case escrow starts right now instead
  // of waiting for a completion event that already happened.
  const alreadyCompleted = await isJobAlreadyCompleted(admin, bookingId, orderId);

  if (payment) {
    // Only re-run the payments-row update + fee reconciliation if it hasn't
    // succeeded yet. Do NOT return early here — markBookingPaidAndNotify /
    // markOrderPaidAndNotify below are what actually flip the booking/order's
    // payment_status, and they must always run (they're independently
    // idempotent via their own `payment_status === "paid"` check). Returning
    // early here previously meant that if the booking/order update failed or
    // threw on the first delivery, no later retry or duplicate event for the
    // same PaymentIntent (e.g. checkout.session.completed alongside
    // payment_intent.succeeded) could ever complete it — the order stayed
    // charged-but-unmarked-paid forever.
    if (payment.status !== "succeeded") {
      const reconciliation = await reconcilePaymentSafely(stripe, pi.id, {
        serviceFeeAmount: payment.service_fee_amount != null ? Number(payment.service_fee_amount) : null,
        commissionAmount: payment.platform_commission_amount != null ? Number(payment.platform_commission_amount) : null,
        refundCommission: payment.refund_commission != null ? Number(payment.refund_commission) : null,
        // A payment can't have a refund before it's first succeeded.
        refundedAmount: null,
        estimatedPayout: payment.estimated_payout_amount != null ? Number(payment.estimated_payout_amount) : null,
        attemptsSoFar: payment.reconciliation_attempts ?? 0,
      });

      const { error: paymentUpdateError } = await admin
        .from("payments")
        .update({
          status: "succeeded",
          stripe_charge_id: chargeId,
          updated_at: new Date().toISOString(),
          ...(alreadyCompleted ? { escrow_started_at: new Date().toISOString() } : {}),
          ...reconciliation,
        })
        .eq("id", payment.id);
      if (paymentUpdateError) {
        // A schema mismatch here (e.g. a column referenced in `reconciliation`
        // doesn't exist) fails the WHOLE update statement, including status —
        // this must be loud, not swallowed, or the payment silently stays
        // "pending" forever even though Stripe succeeded.
        console.error("[stripe-webhook] failed to update payments row", payment.id, paymentUpdateError);
      }
    }
  } else if ((bookingId || orderId) && pi.metadata?.clientId && pi.metadata?.providerId) {
    // Defensive fallback for a PaymentIntent that wasn't created through
    // create-payment-intent (e.g. created directly in the Stripe Dashboard).
    await admin.from("payments").insert({
      booking_id: bookingId,
      order_id: orderId,
      client_id: pi.metadata.clientId,
      provider_id: pi.metadata.providerId,
      stripe_payment_intent_id: pi.id,
      stripe_charge_id: chargeId,
      amount: amountPaid,
      status: "succeeded",
      ...(alreadyCompleted ? { escrow_started_at: new Date().toISOString() } : {}),
    });
  }

  if (bookingId) {
    await markBookingPaidAndNotify(admin, bookingId, chargeId, amountPaid, alreadyCompleted);
  } else if (orderId) {
    await markOrderPaidAndNotify(admin, orderId, chargeId, amountPaid, alreadyCompleted);
  } else {
    console.error("[stripe-webhook] payment_intent.succeeded with no booking/order reference:", pi.id);
  }
}

// ── account.updated (Stripe Connect onboarding status) ──────────────────────

async function handleAccountUpdated(admin: SupabaseClient, account: Stripe.Account): Promise<void> {
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const { error } = await admin
    .from("tradesperson_stripe_accounts")
    .update({
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      disabled_reason: disabledReason,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_connect_account_id", account.id);

  if (error) {
    console.error("[stripe-webhook] failed to sync account.updated for", account.id, error);
  }
}

async function markBookingPaidAndNotify(
  admin: SupabaseClient,
  bookingId: string,
  chargeId: string | null,
  amountPaid: number,
  alreadyCompleted: boolean,
): Promise<void> {
  const { data: booking } = await admin
    .from("client_bookings")
    .select("id, client_id, tradesperson_id, full_name, email, service, payment_status, total_price")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    console.error("[stripe-webhook] booking not found for payment_intent.succeeded:", bookingId);
    return;
  }
  if (booking.payment_status === "paid") return; // idempotent — already handled

  const { error } = await admin
    .from("client_bookings")
    .update({ payment_status: "paid", stripe_charge_id: chargeId })
    .eq("id", bookingId);
  if (error) {
    console.error("[stripe-webhook] failed to mark booking paid:", error);
    return;
  }

  const { data: pro } = await admin
    .from("tradesperson_profiles")
    .select("full_name, username, email")
    .eq("id", booking.tradesperson_id)
    .maybeSingle();

  // amountPaid is what the client was charged (booking amount + platform
  // service fee). The pro only ever sees the booking amount — the fee is
  // platform revenue, never part of the pro's escrow/payout.
  const amountStr = `$${amountPaid.toFixed(2)}`;
  const proAmountStr = `$${Number(booking.total_price ?? amountPaid).toFixed(2)}`;
  const clientName = (booking.full_name as string) ?? "there";
  const proName = (pro?.username as string) ?? (pro?.full_name as string) ?? "there";

  await notifyUser(admin, {
    userId: booking.client_id as string,
    userEmail: (booking.email as string) ?? null,
    title: "Payment successful",
    message: `Your payment of ${amountStr} for ${booking.service} was successful.`,
    type: "payment",
    link: "/client-dashboard/bookings",
    emailHtml: buildPaymentReceivedClientEmail(clientName, amountStr, booking.service as string, `${APP_URL}/client-dashboard/bookings`),
    emailSubject: "Payment received — Capture Connect-TradeHub Marketplace",
  });

  if (pro?.email) {
    const refLabel = `Booking #${(booking.id as string).slice(0, 8).toUpperCase()}`;
    // Escrow only starts once the job is completed (see
    // payments_escrow_start.sql) — unless it already was when this payment
    // settled, in which case escrow starts right now (see
    // isJobAlreadyCompleted's header comment on handlePaymentSucceeded).
    if (alreadyCompleted) {
      await notifyUser(admin, {
        userId: booking.tradesperson_id as string,
        userEmail: pro.email as string,
        title: "Payment received",
        message: `${proAmountStr} was received for ${booking.service}. Since the job is already marked complete, it's been placed in escrow.`,
        type: "payment",
        link: "/pro-dashboard?view=payments",
        emailHtml: buildPaymentReceivedProEmail(proName, proAmountStr, booking.service as string),
        emailSubject: "Payment received — Capture Connect-TradeHub Marketplace",
      });
    } else {
      await notifyUser(admin, {
        userId: booking.tradesperson_id as string,
        userEmail: pro.email as string,
        title: "Payment received",
        message: `${proAmountStr} from ${clientName} was received for ${refLabel}. It's held in the marketplace until the job is marked complete.`,
        type: "payment",
        link: "/pro-dashboard?view=payments",
        emailHtml: buildPaymentReceivedPendingCompletionProEmail(proName, clientName, proAmountStr, refLabel, booking.service as string),
        emailSubject: `Payment received for ${refLabel} — Capture Connect-TradeHub Marketplace`,
      });
    }
  }
}

async function markOrderPaidAndNotify(
  admin: SupabaseClient,
  orderId: number,
  chargeId: string | null,
  amountPaid: number,
  alreadyCompleted: boolean,
): Promise<void> {
  const { data: order } = await admin
    .from("client_shopping")
    .select("id, client_id, tradesperson_id, full_name, email, payment_status, total_price")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    console.error("[stripe-webhook] order not found for payment_intent.succeeded:", orderId);
    return;
  }
  if (order.payment_status === "paid") return; // idempotent

  // total_price is the base amount (items + shipping) fixed at draft-creation
  // time; amountPaid is what Stripe actually collected (base + service fee).
  // The difference is the fee actually charged — store it so past orders show
  // what was really paid instead of recomputing against today's fee percent.
  const serviceFee = Math.max(0, Number((amountPaid - Number(order.total_price ?? 0)).toFixed(2)));

  const { error } = await admin
    .from("client_shopping")
    .update({ payment_status: "paid", stripe_charge_id: chargeId, service_fee: serviceFee })
    .eq("id", orderId);
  if (error) {
    console.error("[stripe-webhook] failed to mark order paid:", error);
    return;
  }

  // Order is only a real, pro-visible record once payment has actually
  // succeeded — this mirrors the activity log entry that used to be written
  // client-side at "place order" time, before there was a payment step.
  const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("client_activity").insert({
    client_id: order.client_id,
    tradesperson_id: order.tradesperson_id,
    activity_type: "order",
    description: `${(order.full_name as string) ?? "A client"} placed a shopping order`,
    expired_at: expiredAt,
  });

  const { data: pro } = await admin
    .from("tradesperson_profiles")
    .select("full_name, username, email")
    .eq("id", order.tradesperson_id)
    .maybeSingle();

  const amountStr = `$${amountPaid.toFixed(2)}`;
  const clientName = (order.full_name as string) ?? "there";
  const proName = (pro?.username as string) ?? (pro?.full_name as string) ?? "there";
  const label = "your order";
  const refLabel = `Order #${String(orderId).padStart(6, "0")}`;

  await notifyUser(admin, {
    userId: order.client_id as string,
    userEmail: (order.email as string) ?? null,
    title: "Payment received",
    message: `Your payment of ${amountStr} for ${label} was successful.`,
    type: "payment",
    link: "/client-dashboard/orders",
    emailHtml: buildPaymentReceivedClientEmail(clientName, amountStr, label, `${APP_URL}/client-dashboard/orders`),
    emailSubject: "Payment received — Capture Connect-TradeHub Marketplace",
  });

  if (pro?.email) {
    // Escrow only starts once the order is marked delivered/picked up (see
    // payments_escrow_start.sql) — unless it already was when this payment
    // settled, in which case escrow starts right now (mirrors the booking path).
    if (alreadyCompleted) {
      await notifyUser(admin, {
        userId: order.tradesperson_id as string,
        userEmail: pro.email as string,
        title: "Payment received",
        message: `${amountStr} was received for an order from ${clientName}. Since the order is already marked complete, it's been placed in escrow.`,
        type: "payment",
        link: "/pro-dashboard?view=orders",
        emailHtml: buildPaymentReceivedProEmail(proName, amountStr, label),
        emailSubject: "Payment received — Capture Connect-TradeHub Marketplace",
      });
    } else {
      await notifyUser(admin, {
        userId: order.tradesperson_id as string,
        userEmail: pro.email as string,
        title: "Payment received",
        message: `${amountStr} from ${clientName} was received for ${refLabel}. It's held in the marketplace until the order is marked complete.`,
        type: "payment",
        link: "/pro-dashboard?view=orders",
        emailHtml: buildPaymentReceivedPendingCompletionProEmail(proName, clientName, amountStr, refLabel, label),
        emailSubject: `Payment received for ${refLabel} — Capture Connect-TradeHub Marketplace`,
      });
    }
  }
}

// ── payment_intent.payment_failed ───────────────────────────────────────────

async function handlePaymentFailed(admin: SupabaseClient, pi: Stripe.PaymentIntent): Promise<void> {
  const failureMessage = pi.last_payment_error?.message ?? "Payment failed.";

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, order_id, status")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();

  if (payment) {
    if (payment.status === "failed") return; // idempotent
    await admin
      .from("payments")
      .update({ status: "failed", failure_message: failureMessage, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
  }

  const bookingId: string | null = payment?.booking_id ?? (pi.metadata?.bookingId || null);
  const orderId: number | null = payment?.order_id ?? (pi.metadata?.orderId ? Number(pi.metadata.orderId) : null);
  const amountStr = `$${(pi.amount / 100).toFixed(2)}`;

  if (bookingId) {
    const { data: booking } = await admin
      .from("client_bookings")
      .select("client_id, email, full_name, service")
      .eq("id", bookingId)
      .maybeSingle();
    if (booking?.email) {
      const retryUrl = `${APP_URL}/client-dashboard/booking-checkout/${bookingId}`;
      await notifyUser(admin, {
        userId: booking.client_id as string,
        userEmail: booking.email as string,
        title: "Payment failed",
        message: `Your payment of ${amountStr} for ${booking.service} could not be processed.`,
        type: "payment",
        link: `/client-dashboard/booking-checkout/${bookingId}`,
        emailHtml: buildPaymentFailedEmail((booking.full_name as string) ?? "there", amountStr, booking.service as string, retryUrl),
        emailSubject: "Payment failed — Capture Connect-TradeHub Marketplace",
      });
    }
  } else if (orderId) {
    const { data: order } = await admin
      .from("client_shopping")
      .select("client_id, email, full_name")
      .eq("id", orderId)
      .maybeSingle();
    if (order?.email) {
      const retryUrl = `${APP_URL}/client-dashboard/orders`;
      await notifyUser(admin, {
        userId: order.client_id as string,
        userEmail: order.email as string,
        title: "Payment failed",
        message: `Your payment of ${amountStr} for your order could not be processed.`,
        type: "payment",
        link: "/client-dashboard/orders",
        emailHtml: buildPaymentFailedEmail((order.full_name as string) ?? "there", amountStr, "your order", retryUrl),
        emailSubject: "Payment failed — Capture Connect-TradeHub Marketplace",
      });
    }
  }
}

// ── charge.refunded ──────────────────────────────────────────────────────────

async function handleChargeRefunded(admin: SupabaseClient, charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const refundedAmount = charge.amount_refunded / 100;

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, order_id, status, refunded_amount, base_amount, platform_commission_amount, platform_net_service_fee, estimated_payout_amount, stripe_fee_verified")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!payment) {
    console.error("[stripe-webhook] charge.refunded for unknown payment intent:", paymentIntentId);
    return;
  }

  // issue-refund only ever refunds the booking/order's base_amount — the
  // service fee is never returned to the client (see issue-refund's header
  // comment) — so charge.amount_refunded can never reach charge.amount
  // (base + service fee). Comparing against charge.amount here meant
  // fullyRefunded was always false, refund_commission was never written, and
  // every refund got stuck at status "partially_refunded" forever. The
  // correct "fully refunded" signal is whether the base_amount itself has
  // been returned in full.
  const baseAmount = payment.base_amount != null ? Number(payment.base_amount) : null;
  const fullyRefunded = baseAmount != null && refundedAmount >= baseAmount - 0.01;
  const status = fullyRefunded ? "refunded" : "partially_refunded";

  if (payment.status === status && Number(payment.refunded_amount) === refundedAmount) return; // idempotent

  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = { status, refunded_amount: refundedAmount, refunded_at: nowIso, updated_at: nowIso };

  // A full refund only ever returns the booking/order's base amount (see
  // issue-refund) — the service fee stays with the platform. Since the pro
  // didn't ultimately keep a paid transaction, they receive nothing for it,
  // and the platform forfeits the commission it would have taken from their
  // share rather than collecting it anyway. refund_commission records that
  // forfeited amount without ever mutating the original immutable
  // platform_commission_amount snapshot.
  //
  // final_revenue is always platform_commission_amount + platform_net_service_fee
  // - refund_commission (see buildReconciliationUpdate, the formula's other
  // source of truth). Here refund_commission is set to the FULL commission
  // amount above, so that formula algebraically collapses to just
  // platform_net_service_fee — the commission term cancels itself out, it
  // isn't being dropped. This only runs if reconciliation has already
  // produced platform_net_service_fee; otherwise buildReconciliationUpdate
  // applies the same (uncollapsed) formula once reconciliation does run,
  // using the refund_commission this write just set.
  if (fullyRefunded) {
    const commission = payment.platform_commission_amount != null ? Number(payment.platform_commission_amount) : null;
    update.actual_payout_amount = 0;
    update.refund_commission = commission;
    if (payment.platform_net_service_fee != null) {
      update.final_revenue = Number(payment.platform_net_service_fee);
    }
  } else if (payment.stripe_fee_verified && payment.estimated_payout_amount != null) {
    // Partial refund: the platform still collects its FULL commission (only
    // a full refund forfeits it — see above) — the pro's payout instead
    // absorbs whatever's been refunded so far, floored at 0. refund_commission
    // stays untouched/null: nothing was forfeited. Only correct
    // actual_payout_amount here if reconciliation already stamped it (see
    // reconcilePaymentSafely's header comment on what "actual" signals);
    // otherwise buildReconciliationUpdate applies this identical formula
    // once reconciliation does run, using the refunded_amount this write
    // just set.
    update.actual_payout_amount = Math.max(0, Number(payment.estimated_payout_amount) - refundedAmount);
  }

  await admin
    .from("payments")
    .update(update)
    .eq("id", payment.id);

  const amountStr = `$${refundedAmount.toFixed(2)}`;
  const newPaymentStatus = fullyRefunded ? "refunded" : "paid";

  if (payment.booking_id) {
    await admin
      .from("client_bookings")
      .update({ refunded: true, payment_status: newPaymentStatus })
      .eq("id", payment.booking_id);

    // Close out a matching approved return request, if the refund came from that flow.
    await admin
      .from("return_request")
      .update({ status: "refunded" })
      .eq("booking_id", payment.booking_id)
      .eq("status", "pro_approved");

    const { data: booking } = await admin
      .from("client_bookings")
      .select("client_id, tradesperson_id, email, full_name, service")
      .eq("id", payment.booking_id)
      .maybeSingle();
    if (booking) {
      if (booking.email) {
        await notifyUser(admin, {
          userId: booking.client_id as string,
          userEmail: booking.email as string,
          title: "Refund processed",
          message: `A refund of ${amountStr} for ${booking.service} has been processed.`,
          type: "payment",
          link: "/client-dashboard/bookings",
          emailHtml: buildRefundProcessedClientEmail((booking.full_name as string) ?? "there", amountStr, booking.service as string),
          emailSubject: "Refund processed — Capture Connect-TradeHub Marketplace",
        });
      }
      const { data: pro } = await admin
        .from("tradesperson_profiles")
        .select("full_name, username, email")
        .eq("id", booking.tradesperson_id)
        .maybeSingle();
      if (pro?.email) {
        await notifyUser(admin, {
          userId: booking.tradesperson_id as string,
          userEmail: pro.email as string,
          title: "Payment refunded",
          message: `${amountStr} was refunded to the client for ${booking.service}.`,
          type: "payment",
          link: "/pro-dashboard?view=payments",
          emailHtml: buildRefundProcessedProEmail((pro.username as string) ?? (pro.full_name as string) ?? "there", amountStr, booking.service as string),
          emailSubject: "A payment was refunded — Capture Connect-TradeHub Marketplace",
        });
      }
    }
  } else if (payment.order_id) {
    await admin
      .from("client_shopping")
      .update({ refunded: true, payment_status: newPaymentStatus })
      .eq("id", payment.order_id);

    await admin
      .from("return_request")
      .update({ status: "refunded" })
      .eq("order_id", payment.order_id)
      .eq("status", "pro_approved");

    const { data: order } = await admin
      .from("client_shopping")
      .select("client_id, tradesperson_id, email, full_name")
      .eq("id", payment.order_id)
      .maybeSingle();
    if (order) {
      const label = "your order";
      if (order.email) {
        await notifyUser(admin, {
          userId: order.client_id as string,
          userEmail: order.email as string,
          title: "Refund processed",
          message: `A refund of ${amountStr} for ${label} has been processed.`,
          type: "payment",
          link: "/client-dashboard/orders",
          emailHtml: buildRefundProcessedClientEmail((order.full_name as string) ?? "there", amountStr, label),
          emailSubject: "Refund processed — Capture Connect-TradeHub Marketplace",
        });
      }
      const { data: pro } = await admin
        .from("tradesperson_profiles")
        .select("full_name, username, email")
        .eq("id", order.tradesperson_id)
        .maybeSingle();
      if (pro?.email) {
        await notifyUser(admin, {
          userId: order.tradesperson_id as string,
          userEmail: pro.email as string,
          title: "Payment refunded",
          message: `${amountStr} was refunded to the client for ${label}.`,
          type: "payment",
          link: "/pro-dashboard?view=orders",
          emailHtml: buildRefundProcessedProEmail((pro.username as string) ?? (pro.full_name as string) ?? "there", amountStr, label),
          emailSubject: "A payment was refunded — Capture Connect-TradeHub Marketplace",
        });
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** True if the booking is already "completed" / the order already delivered — see handlePaymentSucceeded's header comment. */
async function isJobAlreadyCompleted(
  admin: SupabaseClient,
  bookingId: string | null,
  orderId: number | null,
): Promise<boolean> {
  if (bookingId) {
    const { data } = await admin
      .from("client_bookings")
      .select("booking_status")
      .eq("id", bookingId)
      .maybeSingle();
    return data?.booking_status === "completed";
  }
  if (orderId) {
    const { data } = await admin
      .from("client_shopping")
      .select("isDelivered")
      .eq("id", orderId)
      .maybeSingle();
    return data?.isDelivered === true;
  }
  return false;
}

function extractChargeId(pi: Stripe.PaymentIntent): string | null {
  if (!pi.latest_charge) return null;
  return typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
}

/**
 * Retrieves the exact Stripe fee breakdown for a settled PaymentIntent and
 * shapes it into a `payments` row update. Never estimates: if reconciliation
 * fails (balance transaction not yet available, network error, etc.) this
 * does NOT throw and does NOT block marking the booking/order paid — it
 * returns stripe_fee_verified: false plus the incremented attempt/error
 * columns, and reconcile-pending-payments retries it later. actual_payout_amount
 * mirrors estimated_payout_amount (payout math never depends on Stripe's
 * cut — the platform's own margin absorbs any variance) but is only stamped
 * once Stripe's fee is genuinely known, keeping "actual" a meaningful signal
 * that reconciliation actually ran, not just a copy of the estimate.
 */
async function reconcilePaymentSafely(
  stripe: Stripe,
  paymentIntentId: string,
  known: {
    serviceFeeAmount: number | null;
    commissionAmount: number | null;
    refundCommission: number | null;
    refundedAmount: number | null;
    estimatedPayout: number | null;
    attemptsSoFar: number;
  },
): Promise<Record<string, unknown>> {
  try {
    const result = await reconcilePayment(stripe, paymentIntentId);
    return buildReconciliationUpdate(result, known);
  } catch (err) {
    const message = describeError(err);
    console.error("[stripe-webhook] fee reconciliation failed for", paymentIntentId, message);
    return {
      stripe_fee_verified: false,
      reconciliation_attempts: known.attemptsSoFar + 1,
      reconciliation_last_error: message,
    };
  }
}
