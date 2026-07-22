-- ============================================================
-- Admin has no way of knowing when a payment's escrow hold period has
-- ended and a payout is now due — payments_ready_for_payout (see
-- payments_escrow_start.sql) is a passive view nobody was ever polling.
-- release-payout only runs when an admin manually triggers it, so without
-- an alert, ready payouts could sit unreleased indefinitely.
--
-- payout_ready_notified_at is a dedup marker: once a payment has been
-- included in an admin alert email, it's stamped so it never triggers a
-- second email. Only a NEW payment newly crossing the hold threshold will
-- appear in a future alert. Stamped by notify-payout-ready's own
-- service-role write — no client-writable RLS policy needed (same
-- reasoning as escrow_started_at in payments_escrow_start.sql).
--
-- NOTE: even though payments_ready_for_payout is `SELECT *`, Postgres
-- expands `*` into an explicit column list at CREATE VIEW time — it does
-- NOT pick up columns added to the base table afterward. The view must be
-- dropped and recreated for payout_ready_notified_at to be selectable
-- through it (same reason payments_escrow_start.sql recreated this view
-- when it added escrow_started_at).
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payout_ready_notified_at timestamptz;

-- Recreate the view so the new column is exposed. Everything else is
-- unchanged from payments_escrow_start.sql, plus the new dedup filter.
DROP VIEW IF EXISTS public.payments_ready_for_payout;

CREATE OR REPLACE VIEW public.payments_ready_for_payout
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status IN ('succeeded', 'partially_refunded')
  AND stripe_fee_verified = true
  AND payout_status IS NULL
  AND payout_hold_days_used IS NOT NULL
  AND escrow_started_at IS NOT NULL
  AND now() >= escrow_started_at + (payout_hold_days_used || ' days')::interval;

GRANT SELECT ON public.payments_ready_for_payout TO service_role, authenticated;

-- Verify.
SELECT id, status, payout_status, escrow_started_at, payout_ready_notified_at
FROM public.payments_ready_for_payout
ORDER BY escrow_started_at DESC
LIMIT 20;
