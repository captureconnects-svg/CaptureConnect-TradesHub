/**
 * notify-payout-ready Edge Function (scheduled)
 *
 * POST /functions/v1/notify-payout-ready
 *
 * Scans public.payments_ready_for_payout (payments whose escrow hold
 * period — see payments_escrow_start.sql — has ended and are still
 * unreleased) for rows that haven't been flagged to the admin yet
 * (payout_ready_notified_at IS NULL), sends ONE summary email to every
 * admin/super_admin listing what's outstanding, then stamps
 * payout_ready_notified_at on those rows so the same payout never re-alerts
 * on every cron tick — only a payment newly crossing the hold threshold
 * triggers another email.
 *
 * Callable two ways, same pattern as reconcile-pending-payments:
 *   1. An admin's Supabase session token (Authorization: Bearer ...) — for
 *      an on-demand "check now" trigger from the admin dashboard.
 *   2. A `x-cron-secret` header matching the CRON_SECRET secret — for
 *      unattended scheduling via pg_cron (see scheduled_jobs.sql).
 *
 * Requires the following Supabase secrets (already set for the other
 * scheduled functions):
 *   supabase secrets set CRON_SECRET=<a long random string>
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";
import { buildAdminPayoutsReadyAlertEmail, sendAdminAlert } from "../_shared/emails.ts";

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

  const { data: ready, error } = await admin
    .from("payments_ready_for_payout")
    .select("id, currency, actual_payout_amount")
    .is("payout_ready_notified_at", null);

  if (error) {
    console.error("[notify-payout-ready] failed to load ready payouts:", error);
    return jsonResponse({ error: "Failed to load ready payouts." }, 500);
  }

  const rows = ready ?? [];
  if (rows.length === 0) {
    return jsonResponse({ notified: 0 });
  }

  const totalsByCurrency = new Map<string, number>();
  for (const row of rows) {
    const currency = String(row.currency ?? "usd").toUpperCase();
    const amount = Number(row.actual_payout_amount ?? 0);
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount);
  }
  const totalsLine = Array.from(totalsByCurrency.entries())
    .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
    .join(", ");

  const subject = rows.length === 1 ? "1 payout is ready to release" : `${rows.length} payouts are ready to release`;
  const html = buildAdminPayoutsReadyAlertEmail(rows.length, totalsLine);

  await sendAdminAlert(admin, subject, html);

  const ids = rows.map((row) => row.id);
  const { error: stampError } = await admin
    .from("payments")
    .update({ payout_ready_notified_at: new Date().toISOString() })
    .in("id", ids);
  if (stampError) {
    console.error("[notify-payout-ready] failed to stamp notified rows:", stampError);
  }

  return jsonResponse({ notified: rows.length, totals: totalsLine });
});
