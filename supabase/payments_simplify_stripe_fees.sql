-- ============================================================
-- Simplifies the payments ledger's Stripe fee columns down to exactly two:
-- stripe_processing_fee and stripe_net_amount, taken verbatim from the
-- Balance Transaction's `fee` and `net` fields (never bucketed, never
-- estimated). Replaces the old 6-column fee-category breakdown
-- (stripe_processing_fee as a sub-bucket + application/cross-border/
-- currency-conversion/network/tax fee columns + stripe_total_fee).
--
-- The exact, unbucketed Balance Transaction fee already lived under one of
-- two possible prior names depending on how far your table's migration
-- history got — stripe_total_fee (if payments_financial_ledger.sql's
-- Section 1 rename ran) or stripe_fee_amount (the original pre-ledger-
-- upgrade name, if it didn't). Whichever is found is renamed in place to
-- stripe_processing_fee so existing reconciled history is preserved.
-- stripe_net_amount is freshly added and will backfill on the next
-- reconciliation pass (existing succeeded rows keep stripe_fee_verified =
-- true, so nothing gets automatically reconciled again).
--
-- payments_awaiting_reconciliation and payments_ready_for_payout are
-- `SELECT *` views, so they depend on every column including the ones being
-- dropped/renamed here — dropped and recreated around the ALTER TABLE.
--
-- Safe to re-run — every step checks current state first before acting, so
-- running this twice (or running it after the rename already landed) is a
-- no-op the second time instead of erroring.
-- ============================================================

DROP VIEW IF EXISTS public.payments_awaiting_reconciliation;
DROP VIEW IF EXISTS public.payments_ready_for_payout;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_application_fee,
  DROP COLUMN IF EXISTS stripe_cross_border_fee,
  DROP COLUMN IF EXISTS stripe_currency_conversion_fee,
  DROP COLUMN IF EXISTS stripe_network_fee,
  DROP COLUMN IF EXISTS stripe_tax_fee;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stripe_total_fee'
  ) THEN
    -- stripe_total_fee still exists, so this hasn't been migrated yet: the
    -- current stripe_processing_fee (if any) is the stale bucket value —
    -- drop it and promote the exact total in its place.
    ALTER TABLE public.payments DROP COLUMN IF EXISTS stripe_processing_fee;
    ALTER TABLE public.payments RENAME COLUMN stripe_total_fee TO stripe_processing_fee;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stripe_fee_amount'
  ) THEN
    -- financial_ledger.sql's Section 1 rename never ran on this table either —
    -- go straight from the original pre-ledger-upgrade name.
    ALTER TABLE public.payments DROP COLUMN IF EXISTS stripe_processing_fee;
    ALTER TABLE public.payments RENAME COLUMN stripe_fee_amount TO stripe_processing_fee;
  END IF;
  -- Otherwise: neither stale name exists — either this has already been
  -- migrated (leave stripe_processing_fee as-is) or it's a fresh install
  -- where financial_ledger.sql creates stripe_processing_fee directly.
END $$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_processing_fee numeric(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_net_amount      numeric(10, 2);

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
