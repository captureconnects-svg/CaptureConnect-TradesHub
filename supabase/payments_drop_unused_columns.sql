-- ============================================================
-- Drops payments ledger columns that reconciliation populated but nothing
-- in the app ever reads: the raw Stripe payment_method id (only
-- stripe_payment_method_type / stripe_card_brand / stripe_card_country /
-- stripe_card_funding are surfaced), the settlement net amount, the
-- funds-available timestamp, and the raw per-fee JSON breakdown (the
-- bucketed stripe_processing_fee / stripe_application_fee / etc. columns
-- already cover what the admin dashboard shows).
--
-- payments_awaiting_reconciliation and payments_ready_for_payout (defined in
-- payments_financial_ledger.sql) are `SELECT *` views, so Postgres treats
-- them as depending on every column including the ones being dropped here —
-- they have to be dropped and recreated around the ALTER TABLE rather than
-- CASCADEd away permanently.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

DROP VIEW IF EXISTS public.payments_awaiting_reconciliation;
DROP VIEW IF EXISTS public.payments_ready_for_payout;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_payment_method,
  DROP COLUMN IF EXISTS stripe_net_amount,
  DROP COLUMN IF EXISTS stripe_available_on,
  DROP COLUMN IF EXISTS stripe_fee_details_json;

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

-- DROP VIEW (unlike CREATE OR REPLACE VIEW on an existing view) does not
-- preserve grants — the recreated view starts with only the owner's
-- privileges, so service_role (Edge Functions) and authenticated (admin
-- dashboard) need these re-granted every time this script runs.
GRANT SELECT ON public.payments_awaiting_reconciliation TO service_role, authenticated;
GRANT SELECT ON public.payments_ready_for_payout       TO service_role, authenticated;
