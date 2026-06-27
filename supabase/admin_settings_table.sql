-- Admin settings stored in the database instead of localStorage.
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  site_name text NOT NULL DEFAULT 'TradeHub',
  maintenance_mode boolean NOT NULL DEFAULT false,
  allow_registrations boolean NOT NULL DEFAULT true,
  session_timeout_hours integer NOT NULL DEFAULT 24,
  default_currency text NOT NULL DEFAULT 'USD',
  audit_log_retention_days integer NOT NULL DEFAULT 90,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admin_settings_single_row CHECK (id = 1)
);

-- Seed the default row.
INSERT INTO public.admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS.
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Security-definer helper so the write policy can read auth.users without
-- hitting the "permission denied for table users" error.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  );
$$;

-- READ: everyone (including anonymous visitors) can read settings so that
-- maintenance mode is visible before any login occurs.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;
CREATE POLICY "Anyone can read settings"
ON public.admin_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- WRITE: only admins and super_admins can insert or update settings.
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can write settings" ON public.admin_settings;
CREATE POLICY "Admins can write settings"
ON public.admin_settings
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
