-- Public-safe aggregate for the landing page "Trade Revenue Generated" stat.
--
-- public.payments RLS (see stripe_payments_table.sql) only lets a client/pro
-- see their own rows and admins see all — there is no anon policy, so a
-- direct `select actual_payout_amount from payments` from the public landing
-- page would return $0 for anonymous visitors. This function runs as
-- SECURITY DEFINER to bypass RLS but only ever returns a single summed
-- number, never row-level payment data, so it's safe to expose to anon.
--
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE OR REPLACE FUNCTION public.get_total_trade_revenue()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(SUM(actual_payout_amount), 0) FROM public.payments;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_trade_revenue() TO anon, authenticated;
