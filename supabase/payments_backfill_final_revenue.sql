-- ============================================================
-- Backfills final_revenue for `payments` rows that were reconciled
-- (platform_net_service_fee already computed by Stripe fee reconciliation)
-- before final_revenue existed as a column, and so never had it stamped.
-- Reports sum final_revenue directly (see src/lib/payments/reports.ts), so
-- these rows were silently contributing $0 to every revenue total despite
-- having a fully known commission + net service fee.
--
-- Formula matches buildReconciliationUpdate (the single source of truth):
--   final_revenue = platform_commission_amount + platform_net_service_fee
--                    - COALESCE(refund_commission, 0)
--
-- Safe to re-run — only touches rows where final_revenue is still NULL.
-- ============================================================

UPDATE public.payments
SET final_revenue = COALESCE(platform_commission_amount, 0)
                     + platform_net_service_fee
                     - COALESCE(refund_commission, 0)
WHERE final_revenue IS NULL
  AND platform_net_service_fee IS NOT NULL;
