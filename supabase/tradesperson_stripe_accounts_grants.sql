-- Base table-level grant for tradesperson_stripe_accounts, missing since
-- creation — see tradesperson_banking_details_grants.sql for the full
-- explanation (RLS policies don't take effect without an underlying
-- Postgres GRANT; PostgREST runs as the anon/authenticated role per request).
--
-- Only SELECT is needed: tradesperson_stripe_accounts_table.sql's RLS only
-- grants SELECT to authenticated (pros can view own, admins can view all) —
-- all writes go through the create-connect-account / stripe-webhook Edge
-- Functions using the service role key, which bypasses RLS and grants.
--
-- Run in Supabase SQL Editor. Safe to re-run.

GRANT SELECT ON public.tradesperson_stripe_accounts TO authenticated;
