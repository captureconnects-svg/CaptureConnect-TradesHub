-- ============================================================
-- Reverts the payments ledger column name back to what it was before
-- payments_financial_ledger.sql renamed it:
--
--   platform_net_revenue -> platform_net_service_fee
--
-- ("net revenue" read as the platform's total take, which is actually
-- final_revenue; this column is only the client service fee net of
-- Stripe's cut, so "net service fee" is the accurate name.)
--
-- Fresh installs never see this rename — payments_net_revenue.sql creates
-- the column directly as platform_net_service_fee, and
-- payments_financial_ledger.sql no longer renames it away. This script is
-- only needed on databases that already ran the old rename.
--
-- payments_awaiting_reconciliation and payments_ready_for_payout are
-- `SELECT *` views — dropped and recreated around the ALTER TABLE, with
-- grants re-applied (DROP VIEW does not preserve them).
--
-- Safe to re-run.
-- ============================================================

DROP VIEW IF EXISTS public.payments_awaiting_reconciliation;
DROP VIEW IF EXISTS public.payments_ready_for_payout;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'platform_net_revenue'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN platform_net_revenue TO platform_net_service_fee;
  END IF;
END $$;

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
  AND column_name IN ('platform_net_revenue', 'platform_net_service_fee')
ORDER BY column_name;
