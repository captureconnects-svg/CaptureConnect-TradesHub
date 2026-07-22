-- ============================================================
-- payments_ready_for_payout previously required refunded_amount = 0,
-- which silently excluded partially refunded payments from ever being
-- paid out — even though only the refunded portion should come off the
-- pro's payout (see stripe-webhook's handleChargeRefunded: a partial
-- refund reduces actual_payout_amount but leaves status
-- 'partially_refunded', never 'succeeded').
--
-- A payment should only be permanently excluded from payout once it's
-- FULLY refunded (status = 'refunded', actual_payout_amount = 0) — a
-- partial refund still owes the pro whatever's left. So the view now
-- accepts status IN ('succeeded', 'partially_refunded') and drops the
-- refunded_amount = 0 check entirely (status already encodes "not fully
-- refunded" for both allowed values).
--
-- This is a `SELECT *` view — dropped and recreated with grants
-- re-applied (DROP VIEW does not preserve them).
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

DROP VIEW IF EXISTS public.payments_ready_for_payout;

CREATE OR REPLACE VIEW public.payments_ready_for_payout
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status IN ('succeeded', 'partially_refunded')
  AND stripe_fee_verified = true
  AND payout_status IS NULL
  AND payout_hold_days_used IS NOT NULL
  AND now() >= created_at + (payout_hold_days_used || ' days')::interval;

GRANT SELECT ON public.payments_ready_for_payout TO service_role, authenticated;

-- Verify.
SELECT status, refunded_amount, actual_payout_amount
FROM public.payments_ready_for_payout
ORDER BY created_at DESC
LIMIT 20;
