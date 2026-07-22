-- ============================================================
-- Drops payments.platform_commission_percent_used — redundant and unread.
--
-- It's a pure snapshot of the commission % applied at checkout, but nothing
-- in the app ever reads it (not the admin dashboard, not reports.ts, not
-- reconciliation) and it's reconstructable from the two columns that ARE
-- used: round(platform_commission_amount / base_amount * 100, 2). Unlike
-- payout_hold_days_used (read at payout time by release-payout to compute
-- the hold window) this snapshot has no runtime consumer at all.
--
-- payments_awaiting_reconciliation and payments_ready_for_payout are
-- `SELECT *` views — dropped and recreated around the ALTER TABLE, with
-- grants re-applied (DROP VIEW does not preserve them).
--
-- Safe to re-run.
-- ============================================================

DROP VIEW IF EXISTS public.payments_awaiting_reconciliation;
DROP VIEW IF EXISTS public.payments_ready_for_payout;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS platform_commission_percent_used,
  DROP COLUMN IF EXISTS pro_commission_percent_used;

CREATE OR REPLACE VIEW public.payments_awaiting_reconciliation
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status = 'succeeded'
  AND stripe_fee_verified = false;

CREATE OR REPLACE VIEW public.payments_ready_for_payout
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status = 'succeeded'
  AND stripe_fee_verified = true
  AND payout_status IS NULL
  AND refunded_amount = 0
  AND payout_hold_days_used IS NOT NULL
  AND now() >= created_at + (payout_hold_days_used || ' days')::interval;

GRANT SELECT ON public.payments_awaiting_reconciliation TO service_role, authenticated;
GRANT SELECT ON public.payments_ready_for_payout       TO service_role, authenticated;

-- Verify.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments'
  AND column_name IN ('platform_commission_percent_used', 'pro_commission_percent_used');
