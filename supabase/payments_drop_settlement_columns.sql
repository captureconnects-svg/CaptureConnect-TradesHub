-- ============================================================
-- Drops 4 more payments ledger columns that reconciliation populated but
-- nothing in the app reads: stripe_card_funding, stripe_receipt_url,
-- stripe_settlement_currency, stripe_exchange_rate. Card brand/country and
-- the payment method type are still kept (shown in the admin payment
-- detail dialog); these four never were.
--
-- payments_awaiting_reconciliation and payments_ready_for_payout are
-- `SELECT *` views, so they depend on every column including the ones being
-- dropped here — dropped and recreated around the ALTER TABLE, same as the
-- prior column-drop migrations.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

DROP VIEW IF EXISTS public.payments_awaiting_reconciliation;
DROP VIEW IF EXISTS public.payments_ready_for_payout;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_card_funding,
  DROP COLUMN IF EXISTS stripe_receipt_url,
  DROP COLUMN IF EXISTS stripe_settlement_currency,
  DROP COLUMN IF EXISTS stripe_exchange_rate;

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
