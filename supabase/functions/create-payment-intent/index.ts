/**
 * create-payment-intent Edge Function
 *
 * POST /functions/v1/create-payment-intent
 * Headers: Authorization: Bearer <supabase user access token>
 * Body: { bookingId: string } | { orderId: number }
 *
 * - Authenticates the caller against Supabase (rejects anonymous requests).
 * - Loads the booking/order row filtered by that caller's own id — this is
 *   the ownership check, it is not possible to create a PaymentIntent for
 *   someone else's booking/order.
 * - Recomputes the amount to charge from source-of-truth pricing tables
 *   (packages/add-ons for bookings, product variants/delivery fee for
 *   orders) rather than trusting the booking/order row's stored total —
 *   that row's price columns are client-writable at creation time and are
 *   never trusted for the actual charge. The client never supplies an
 *   amount directly either — this endpoint would ignore it even if sent.
 * - Creates (or reuses) a Stripe PaymentIntent and returns only its
 *   client_secret. Everything else (amount, metadata, keys) stays server-side.
 *
 * Requires the following Supabase secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, type Stripe } from "../_shared/stripe.ts";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { getPlatformSettings, type PlatformSettings } from "../_shared/platformSettings.ts";
import {
  calculateBaseAmount,
  calculateClientServiceFee,
  calculateCheckoutTotal,
  calculateCommission,
  calculateEstimatedPayout,
} from "../_shared/paymentCalculations.ts";

interface CreatePaymentIntentRequest {
  bookingId?: string;
  orderId?: number;
}

const CURRENCY = "usd";

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

  // ── Authenticate the caller ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "Missing Authorization header." }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: "Invalid or expired session." }, 401);
  }
  const clientId = userData.user.id;

  // ── Parse + validate body ────────────────────────────────────────────────
  let body: CreatePaymentIntentRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const { bookingId, orderId } = body;
  if (!bookingId && orderId == null) {
    return jsonResponse({ error: "bookingId or orderId is required." }, 400);
  }
  if (bookingId && orderId != null) {
    return jsonResponse({ error: "Provide only one of bookingId or orderId." }, 400);
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("[create-payment-intent] Stripe not configured:", err);
    return jsonResponse({ error: "Payments are not configured." }, 500);
  }

  const settings = await getPlatformSettings(admin);
  if (settings.platformStatus !== "active") {
    return jsonResponse({ error: "Platform is temporarily unavailable for payments." }, 503);
  }

  try {
    if (bookingId) {
      return await handleBookingPayment(admin, stripe, bookingId, clientId, settings);
    }
    return await handleOrderPayment(admin, stripe, orderId as number, clientId, settings);
  } catch (err) {
    console.error("[create-payment-intent] unexpected error:", err);
    return jsonResponse({ error: "Failed to create payment intent. Try again later." }, 502);
  }
});

/**
 * Recomputes the booking's base price from source-of-truth tables
 * (tradesperson_packages, tradesperson_addOns) instead of trusting
 * client_bookings.total_price/package_price, which are writable by the
 * client at booking-creation time and are not a trustworthy charge amount.
 * tips_optional is a genuine client-chosen extra and is trusted as-is
 * (clamped to be non-negative).
 */
async function computeTrustedBookingBaseAmount(
  admin: SupabaseClient,
  booking: { id: string; tradesperson_id: string; package_id: number | null; tips_optional: number | null },
): Promise<number> {
  let packagePrice = 0;
  if (booking.package_id != null) {
    const { data: pkg } = await admin
      .from("tradesperson_packages")
      .select("package_price")
      .eq("id", booking.package_id)
      .eq("tradesperson_id", booking.tradesperson_id)
      .maybeSingle();
    packagePrice = Number(pkg?.package_price ?? 0);
  }

  const { data: bookingAddons } = await admin
    .from("client_bookings.AddOns")
    .select("addOn_id")
    .eq("booking_id", booking.id);

  const addonIds = [...new Set((bookingAddons ?? []).map((a) => a.addOn_id as number))];
  let addonsTotal = 0;
  if (addonIds.length > 0) {
    const { data: addonDefs } = await admin
      .from("tradesperson_addOns")
      .select("id, addOn_price")
      .in("id", addonIds)
      .eq("tradesperson_id", booking.tradesperson_id);
    addonsTotal = (addonDefs ?? []).reduce((sum, a) => sum + Number(a.addOn_price ?? 0), 0);
  }

  const tip = Math.max(0, Number(booking.tips_optional ?? 0));
  return packagePrice + addonsTotal + tip;
}

async function handleBookingPayment(
  admin: SupabaseClient,
  stripe: Stripe,
  bookingId: string,
  clientId: string,
  settings: PlatformSettings,
): Promise<Response> {
  const { data: booking, error } = await admin
    .from("client_bookings")
    .select("id, tradesperson_id, package_id, tips_optional, booking_status, payment_status, stripe_payment_intent_id")
    .eq("id", bookingId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !booking) {
    return jsonResponse({ error: "Booking not found." }, 404);
  }
  if (booking.booking_status !== "confirmed") {
    return jsonResponse({ error: "Booking must be confirmed by the pro before payment." }, 409);
  }
  if (booking.payment_status === "paid") {
    return jsonResponse({ error: "This booking has already been paid." }, 409);
  }

  const trustedBaseAmount = await computeTrustedBookingBaseAmount(admin, booking);
  if (!(trustedBaseAmount > 0)) {
    return jsonResponse({ error: "Nothing to charge for this booking." }, 400);
  }
  const bookingAmount = calculateBaseAmount(trustedBaseAmount);
  const serviceFee = calculateClientServiceFee(bookingAmount, settings.clientServiceFeePercent);
  const amount = calculateCheckoutTotal(bookingAmount, settings.clientServiceFeePercent);
  const commissionAmount = calculateCommission(bookingAmount, settings.proCommissionPercent);
  const estimatedPayout = calculateEstimatedPayout(bookingAmount, settings.proCommissionPercent);

  const clientSecret = await resolveClientSecret(admin, stripe, {
    existingPaymentIntentId: booking.stripe_payment_intent_id ?? null,
    amount,
    metadata: {
      bookingId,
      orderId: "",
      clientId,
      providerId: booking.tradesperson_id as string,
      bookingAmount: String(bookingAmount),
      serviceFee: String(serviceFee),
    },
    onNewIntent: async (paymentIntentId: string) => {
      const { error: insertError } = await admin.from("payments").insert({
        booking_id: bookingId,
        client_id: clientId,
        provider_id: booking.tradesperson_id,
        stripe_payment_intent_id: paymentIntentId,
        amount,
        currency: CURRENCY,
        status: "pending",
        base_amount: bookingAmount,
        service_fee_amount: serviceFee,
        platform_commission_amount: commissionAmount,
        estimated_payout_amount: estimatedPayout,
        client_fee_percent_used: settings.clientServiceFeePercent,
        payout_hold_days_used: settings.defaultPayoutHoldDays,
        platform_settings_version: settings.version,
      });
      // Must throw, not just log: a silent failure here leaves the
      // PaymentIntent charging the customer with no calculation-snapshot row
      // to match it — the webhook's defensive fallback insert then creates a
      // bare payments row with base_amount/service_fee_amount/client_fee_percent_used/etc
      // all NULL forever, since that fallback has no way to know what this
      // function already calculated.
      if (insertError) {
        console.error("[create-payment-intent] failed to insert payments row for booking", bookingId, insertError);
        throw new Error("Failed to record payment.");
      }
      await admin
        .from("client_bookings")
        .update({ stripe_payment_intent_id: paymentIntentId, total_price: bookingAmount })
        .eq("id", bookingId);
    },
  });

  return jsonResponse({ client_secret: clientSecret });
}

/**
 * Recomputes the order's item subtotal and shipping fee from source-of-truth
 * tables (tradesperson_Sell.Spe.variant, tradesperson_profiles.delivery_fee)
 * instead of trusting client_shopping.total_price/sub_total/shipping_total,
 * which are writable by the client at order-creation time. Only counts items
 * whose variant belongs to the order's own tradesperson, closing off
 * cross-tenant price substitution (pointing item_id at another pro's
 * cheaper product).
 */
async function computeTrustedOrderAmounts(
  admin: SupabaseClient,
  order: { id: number; tradesperson_id: string; shipping_method: string },
): Promise<{ subTotal: number; shippingTotal: number }> {
  const { data: items } = await admin
    .from("client_shopping.ITEMS")
    .select("item_id, quantity")
    .eq("shopping_id", order.id);

  const rows = (items ?? []) as { item_id: number | null; quantity: number | null }[];
  const variantIds = [...new Set(rows.filter((r) => r.item_id != null).map((r) => r.item_id as number))];

  const trustedPriceByVariant: Record<number, number> = {};
  if (variantIds.length > 0) {
    const { data: variants } = await admin
      .from("tradesperson_Sell.Spe.variant")
      .select("id, product_id, product_price")
      .in("id", variantIds);

    const productIds = [...new Set((variants ?? []).map((v) => v.product_id as number))];
    const { data: ownedProducts } =
      productIds.length > 0
        ? await admin
            .from("tradesperson_SellersSpecialty")
            .select("id")
            .in("id", productIds)
            .eq("tradesperson_id", order.tradesperson_id)
        : { data: [] as { id: number }[] };
    const ownedProductIds = new Set((ownedProducts ?? []).map((p) => p.id as number));

    for (const v of variants ?? []) {
      if (ownedProductIds.has(v.product_id as number)) {
        trustedPriceByVariant[v.id as number] = Number(v.product_price ?? 0);
      }
    }
  }

  const subTotal = rows.reduce((sum, r) => {
    if (r.item_id == null) return sum;
    const price = trustedPriceByVariant[r.item_id];
    if (price == null) return sum;
    const qty = Math.max(0, Number(r.quantity ?? 0));
    return sum + price * qty;
  }, 0);

  let shippingTotal = 0;
  if (order.shipping_method === "delivery") {
    const { data: pro } = await admin
      .from("tradesperson_profiles")
      .select("delivery_fee")
      .eq("id", order.tradesperson_id)
      .maybeSingle();
    shippingTotal = Number(pro?.delivery_fee ?? 9.99);
  }

  return { subTotal, shippingTotal };
}

async function handleOrderPayment(
  admin: SupabaseClient,
  stripe: Stripe,
  orderId: number,
  clientId: string,
  settings: PlatformSettings,
): Promise<Response> {
  const { data: order, error } = await admin
    .from("client_shopping")
    .select("id, tradesperson_id, shipping_method, payment_status, stripe_payment_intent_id")
    .eq("id", orderId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !order) {
    return jsonResponse({ error: "Order not found." }, 404);
  }
  if (order.payment_status === "paid") {
    return jsonResponse({ error: "This order has already been paid." }, 409);
  }

  const { subTotal, shippingTotal } = await computeTrustedOrderAmounts(admin, order);
  const rawOrderAmount = subTotal + shippingTotal;
  if (!(rawOrderAmount > 0)) {
    return jsonResponse({ error: "Nothing to charge for this order." }, 400);
  }
  const orderAmount = calculateBaseAmount(rawOrderAmount);
  const serviceFee = calculateClientServiceFee(orderAmount, settings.clientServiceFeePercent);
  const amount = calculateCheckoutTotal(orderAmount, settings.clientServiceFeePercent);
  const commissionAmount = calculateCommission(orderAmount, settings.proCommissionPercent);
  const estimatedPayout = calculateEstimatedPayout(orderAmount, settings.proCommissionPercent);

  const clientSecret = await resolveClientSecret(admin, stripe, {
    existingPaymentIntentId: order.stripe_payment_intent_id ?? null,
    amount,
    metadata: {
      bookingId: "",
      orderId: String(orderId),
      clientId,
      providerId: order.tradesperson_id as string,
      orderAmount: String(orderAmount),
      serviceFee: String(serviceFee),
    },
    onNewIntent: async (paymentIntentId: string) => {
      const { error: insertError } = await admin.from("payments").insert({
        order_id: orderId,
        client_id: clientId,
        provider_id: order.tradesperson_id,
        stripe_payment_intent_id: paymentIntentId,
        amount,
        currency: CURRENCY,
        status: "pending",
        base_amount: orderAmount,
        service_fee_amount: serviceFee,
        platform_commission_amount: commissionAmount,
        estimated_payout_amount: estimatedPayout,
        client_fee_percent_used: settings.clientServiceFeePercent,
        payout_hold_days_used: settings.defaultPayoutHoldDays,
        platform_settings_version: settings.version,
      });
      // See handleBookingPayment's onNewIntent for why this must throw rather
      // than silently continue.
      if (insertError) {
        console.error("[create-payment-intent] failed to insert payments row for order", orderId, insertError);
        throw new Error("Failed to record payment.");
      }
      await admin
        .from("client_shopping")
        .update({
          stripe_payment_intent_id: paymentIntentId,
          total_price: orderAmount,
          sub_total: calculateBaseAmount(subTotal),
          shipping_total: calculateBaseAmount(shippingTotal),
        })
        .eq("id", orderId);
    },
  });

  return jsonResponse({ client_secret: clientSecret });
}

/**
 * Reuses the existing PaymentIntent for this booking/order when one is still
 * usable (page reload, went back and forward, etc.) instead of minting a new
 * one on every request. Falls back to creating a fresh PaymentIntent when
 * there isn't one yet, or the previous attempt is no longer reusable
 * (succeeded/canceled elsewhere).
 */
async function resolveClientSecret(
  admin: SupabaseClient,
  stripe: Stripe,
  opts: {
    existingPaymentIntentId: string | null;
    amount: number;
    metadata: Record<string, string>;
    onNewIntent: (paymentIntentId: string) => Promise<void>;
  },
): Promise<string> {
  const amountInCents = Math.round(opts.amount * 100);
  const REUSABLE_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

  if (opts.existingPaymentIntentId) {
    try {
      const existing = await stripe.paymentIntents.retrieve(opts.existingPaymentIntentId);
      if (REUSABLE_STATUSES.includes(existing.status)) {
        if (existing.amount !== amountInCents) {
          const updated = await stripe.paymentIntents.update(opts.existingPaymentIntentId, {
            amount: amountInCents,
          });
          return updated.client_secret as string;
        }
        return existing.client_secret as string;
      }
    } catch (err) {
      console.error("[create-payment-intent] failed to retrieve existing intent, creating a new one:", err);
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: CURRENCY,
    // Apple Pay rides on "card" (enabled via the PaymentElement `wallets` option on the
    // frontend), so it isn't listed here as its own type.
    payment_method_types: ["card", "cashapp", "link"],
    metadata: opts.metadata,
  });

  await opts.onNewIntent(paymentIntent.id);

  return paymentIntent.client_secret as string;
}
