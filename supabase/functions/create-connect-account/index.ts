/**
 * create-connect-account Edge Function
 *
 * POST /functions/v1/create-connect-account
 * Headers: Authorization: Bearer <supabase user access token> (the pro)
 *
 * Creates (or reuses) a Stripe Express connected account for the calling
 * pro, requesting only the `transfers` capability — this platform never
 * charges the pro's connected account directly (see release-payout), so
 * `card_payments` is not needed and would only add onboarding requirements.
 *
 * Always mints a fresh Account Link and returns its URL; the frontend
 * redirects the pro there to complete/resume Stripe's hosted onboarding.
 * Onboarding completion is confirmed via the account.updated webhook event
 * handled in stripe-webhook/index.ts, not by this function's response.
 *
 * Requires the following Supabase secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 *   supabase secrets set APP_URL=https://your-app.example.com
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, type Stripe } from "../_shared/stripe.ts";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const APP_URL = Deno.env.get("APP_URL") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !APP_URL) {
    return jsonResponse({ error: "Server misconfigured." }, 500);
  }

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
  const proId = userData.user.id;
  const proEmail = userData.user.email ?? undefined;

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("[create-connect-account] Stripe not configured:", err);
    return jsonResponse({ error: "Payments are not configured." }, 500);
  }

  try {
    const { data: existing } = await admin
      .from("tradesperson_stripe_accounts")
      .select("stripe_connect_account_id")
      .eq("id", proId)
      .maybeSingle();

    let accountId = existing?.stripe_connect_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: proEmail,
        capabilities: { transfers: { requested: true } },
        business_type: "individual",
        metadata: { supabase_user_id: proId },
      });
      accountId = account.id;

      const { error: insertError } = await admin.from("tradesperson_stripe_accounts").insert({
        id: proId,
        stripe_connect_account_id: accountId,
      });
      if (insertError) {
        console.error("[create-connect-account] failed to record new account:", insertError);
        return jsonResponse({ error: "Failed to start onboarding. Try again later." }, 502);
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${APP_URL}/pro-dashboard?view=payments&onboarding=refresh`,
      return_url: `${APP_URL}/pro-dashboard?view=payments&onboarding=return`,
    });

    return jsonResponse({ url: accountLink.url });
  } catch (err) {
    console.error("[create-connect-account] unexpected error:", err);
    return jsonResponse({ error: "Failed to start onboarding. Try again later." }, 502);
  }
});
