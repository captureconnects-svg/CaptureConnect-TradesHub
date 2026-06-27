-- Locks down the admin table so no role can read or write it directly.
-- All membership checks go through SECURITY DEFINER functions (is_admin, is_admin_user)
-- which run as the postgres role and bypass RLS, so this does not break any auth flow.
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to admin table" ON public.admin;
CREATE POLICY "No direct access to admin table"
ON public.admin
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
