/**
 * cleanup-abandoned-orders Edge Function
 *
 * POST /functions/v1/cleanup-abandoned-orders
 *
 * The shopping checkout creates a `client_shopping` order (+ items) row as
 * soon as the client clicks "Continue to Payment" so that create-payment-intent
 * has something to attach a Stripe PaymentIntent to — but that row is only a
 * draft until Stripe confirms the charge (payment_status is set by
 * stripe-webhook, never by the client). If the client abandons checkout
 * (closes the tab, payment fails and they never retry, etc.) that draft row
 * is left behind with payment_status still NULL. This sweep deletes any such
 * draft older than ABANDONED_AFTER_HOURS — old enough that it can't still be
 * a payment in flight — so unpaid carts never show up as real orders.
 *
 * Callable two ways (same convention as reconcile-pending-payments):
 *   1. An admin's Supabase session token (Authorization: Bearer ...).
 *   2. A `x-cron-secret` header matching the CRON_SECRET secret, for
 *      unattended scheduling via the Supabase Dashboard's Cron UI.
 *
 * Requires the following Supabase secret (shared with reconcile-pending-payments):
 *   supabase secrets set CRON_SECRET=<a long random string>
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";

const ABANDONED_AFTER_HOURS = 24;
const BATCH_SIZE = 200;

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

  const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  const { data: abandoned, error: fetchError } = await admin
    .from("client_shopping")
    .select("id")
    .is("payment_status", null)
    .lt("created_at", cutoff)
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[cleanup-abandoned-orders] failed to load abandoned orders:", fetchError);
    return jsonResponse({ error: "Failed to load abandoned orders." }, 500);
  }

  const orderIds = (abandoned ?? []).map((o) => o.id as number);
  if (orderIds.length === 0) {
    return jsonResponse({ deleted: 0 });
  }

  const { error: itemsError } = await admin
    .from("client_shopping.ITEMS")
    .delete()
    .in("shopping_id", orderIds);
  if (itemsError) {
    console.error("[cleanup-abandoned-orders] failed to delete order items:", itemsError);
    return jsonResponse({ error: "Failed to delete abandoned order items." }, 500);
  }

  const { error: deleteError } = await admin
    .from("client_shopping")
    .delete()
    .in("id", orderIds);
  if (deleteError) {
    console.error("[cleanup-abandoned-orders] failed to delete abandoned orders:", deleteError);
    return jsonResponse({ error: "Failed to delete abandoned orders." }, 500);
  }

  return jsonResponse({ deleted: orderIds.length });
});
