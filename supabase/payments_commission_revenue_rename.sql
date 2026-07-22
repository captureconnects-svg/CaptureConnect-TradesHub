-- ============================================================
-- Restructures the payments ledger's commission/revenue columns:
--
--   pro_commission_amount        -> platform_commission_amount
--     (renamed: the platform receives this commission out of the pro's
--     base amount — it was never the pro's money, so "pro_commission" was
--     backwards. The admin dashboard already labelled this row "Platform
--     Commission" despite the column name — the rename just makes the
--     column agree with the label.)
--
--   pro_commission_percent_used -> was renamed to platform_commission_percent_used
--     here, then dropped entirely by payments_drop_commission_percent_used.sql
--     (redundant with platform_commission_amount/base_amount, never read
--     anywhere). No rename step for it below anymore — that script drops
--     both the old and new name, so it doesn't matter which one a given
--     database still has.
--
--   platform_gross_revenue -> DROPPED (it was always byte-for-byte
--     identical to service_fee_amount — both are just the client service
--     fee before Stripe's cut — so it never carried information
--     service_fee_amount didn't already have.)
--
--   final_revenue (NEW) -> platform_commission_amount + platform_net_service_fee,
--     i.e. the platform's true total take from a payment: its commission
--     cut from the pro's side plus its net service fee from the client's
--     side after Stripe's cut. Only known once Stripe fee reconciliation
--     completes (same timing as platform_net_service_fee) — populated by
--     stripe-webhook / reconcile-pending-payments, not at checkout time.
--
--   refund_commission (NEW) -> when a booking/order is fully refunded, the
--     pro receives nothing and the platform does not collect the
--     commission it would have taken (only the service fee is kept — see
--     issue-refund). This records that forfeited commission amount so
--     final_revenue can be recomputed to exclude it, without ever mutating
--     the original immutable platform_commission_amount snapshot.
--
-- payments_awaiting_reconciliation and payments_ready_for_payout are
-- `SELECT *` views — dropped and recreated around the ALTER TABLE, with
-- grants re-applied (DROP VIEW does not preserve them).
--
-- Safe to re-run — every rename is guarded by an existence check.
-- ============================================================

DROP VIEW IF EXISTS public.payments_awaiting_reconciliation;
DROP VIEW IF EXISTS public.payments_ready_for_payout;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'pro_commission_amount'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN pro_commission_amount TO platform_commission_amount;
  END IF;
END $$;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS platform_gross_revenue,
  ADD COLUMN IF NOT EXISTS platform_commission_amount        numeric(10, 2),
  ADD COLUMN IF NOT EXISTS final_revenue                     numeric(10, 2),
  ADD COLUMN IF NOT EXISTS refund_commission                 numeric(10, 2);

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
  AND column_name IN ('platform_commission_amount', 'platform_gross_revenue', 'final_revenue', 'refund_commission')
ORDER BY column_name;
