-- ============================================================
-- Restores SELECT grants on the two payments readiness views that got lost
-- somewhere across the repeated `DROP VIEW` / `CREATE VIEW` cycles run while
-- trimming the payments ledger's Stripe fee columns. `CREATE OR REPLACE VIEW`
-- preserves existing grants, but `DROP VIEW` followed by `CREATE VIEW` does
-- not — the replacement view starts with only the owner's privileges, so
-- service_role (Edge Functions) and authenticated (admin dashboard) both
-- lost access even though the underlying public.payments table grants were
-- untouched.
--
-- security_invoker = true means these views enforce the querying role's own
-- RLS policies on public.payments (see stripe_payments_table.sql) — granting
-- SELECT here does not bypass RLS, it only allows the role to run the query
-- at all; RLS still limits which rows come back for `authenticated`.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

GRANT SELECT ON public.payments_awaiting_reconciliation TO service_role, authenticated;
GRANT SELECT ON public.payments_ready_for_payout       TO service_role, authenticated;

-- Verify: both roles should show up for both views with privilege_type SELECT.
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('payments_awaiting_reconciliation', 'payments_ready_for_payout')
ORDER BY table_name, grantee;
