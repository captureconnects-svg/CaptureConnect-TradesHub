-- Security fix (audit 2026-07-20, follow-up): discovered while adding RLS to
-- verification_request/landing_testimonials/deleted_accounts/client_likes —
-- nearly every table in this project also has a leftover policy from the
-- Supabase Studio "quick start" template (name varies per table, but always
-- `FOR ALL TO public USING (true) WITH CHECK (true)`), left dormant from
-- early development. RLS is enabled on every one of these tables, so these
-- policies are NOT dormant — they are live in production right now and
-- grant full read/write access to EVERYONE, including unauthenticated
-- visitors (the `public` role covers `anon` too), completely overriding the
-- correct scoped policies that already exist alongside them.
--
-- Worst case found: the `admin` table itself had one of these — meaning
-- any unauthenticated visitor could INSERT a row making their own email an
-- admin/super_admin, then pass every is_admin() check in the app.
--
-- The tables below already have complete, correct scoped policies (from
-- their own *_rls_policies.sql files) covering every legitimate access
-- path, so the fix here is a straight DROP — no replacement needed.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

DROP POLICY IF EXISTS "admin"              ON public.admin;
DROP POLICY IF EXISTS "audit"              ON public.audit_logs;
DROP POLICY IF EXISTS "client bookings"    ON public.client_bookings;
DROP POLICY IF EXISTS "client profiles"    ON public.client_profiles;
DROP POLICY IF EXISTS "client reviews"     ON public.client_reviews;
DROP POLICY IF EXISTS "client shopping"    ON public.client_shopping;
DROP POLICY IF EXISTS "conver"             ON public.conversations;
DROP POLICY IF EXISTS "msg"                ON public.conversations_msg;
DROP POLICY IF EXISTS "return_request"     ON public.return_request;
DROP POLICY IF EXISTS "merchandise image"  ON public."tradesperson_Sell.Spe.images";
DROP POLICY IF EXISTS "varient"            ON public."tradesperson_Sell.Spe.variant";
DROP POLICY IF EXISTS "sellers"            ON public."tradesperson_SellersSpecialty";
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tradesperson_profiles;
