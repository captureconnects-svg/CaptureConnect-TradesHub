-- Public-safe aggregates for the landing page stats row ("Verified
-- Tradespeople", "Jobs Completed", "Trade Revenue Generated").
--
-- tradesperson_profiles_pii_hardening_2026-07-20.sql replaced the old
-- blanket "Anyone can view tradesperson profiles" policy with owner/admin/
-- related-client only policies (no anon, no blanket authenticated) to stop
-- leaking dob/gender/email. That also silently zeroed out the landing
-- page's `select("id", { count: "exact", head: true })` against
-- tradesperson_profiles for anonymous visitors.
--
-- client_bookings and client_shopping never had (and shouldn't get) an
-- anon/blanket SELECT policy either — booking and order rows are private —
-- so the "Jobs Completed" counts (completed bookings + delivered orders)
-- are equally invisible to anon.
--
-- Same fix pattern as get_total_trade_revenue() in
-- payments_public_revenue_total.sql: SECURITY DEFINER functions that only
-- ever return a single aggregate number, never row-level data, so they're
-- safe to expose to anon without reopening the underlying tables.
--
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE OR REPLACE FUNCTION public.get_total_verified_pros()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*) FROM public.tradesperson_profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_verified_pros() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_total_jobs_completed()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.client_bookings WHERE booking_status = 'completed')
    + (SELECT COUNT(*) FROM public.client_shopping WHERE "isDelivered" = true);
$$;

GRANT EXECUTE ON FUNCTION public.get_total_jobs_completed() TO anon, authenticated;
