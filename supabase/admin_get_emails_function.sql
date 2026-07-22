-- SECURITY DEFINER function that returns the email of every admin/super_admin.
-- The admin table itself is locked down (see admin_table_rls.sql — "no direct
-- access" for anon/authenticated), so admin-alert emails (triggered by
-- ordinary users: contact form, refund requests, verification submissions,
-- booking events, testimonials) need a bypass to know who to notify.
-- Only emails are exposed — no other admin columns.
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE OR REPLACE FUNCTION public.get_admin_emails()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(email), ARRAY[]::text[])
  FROM public.admin
  WHERE role IN ('admin', 'super_admin')
    AND email IS NOT NULL;
$$;

-- Callable by anyone, including anonymous visitors, since some admin alerts
-- (e.g. the contact form) are triggered before the sender is authenticated.
GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO anon, authenticated;
