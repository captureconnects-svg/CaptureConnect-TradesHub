-- Self-access RLS policies for client_profiles and tradesperson_profiles.
-- Admin-access policies are already in admin_rls_policies.sql.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ── client_profiles ────────────────────────────────────────────────────────────

-- Users can read and write their own profile.
DROP POLICY IF EXISTS "Clients can view own profile" ON public.client_profiles;
CREATE POLICY "Clients can view own profile"
ON public.client_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own profile" ON public.client_profiles;
CREATE POLICY "Clients can update own profile"
ON public.client_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Clients can insert own profile" ON public.client_profiles;
CREATE POLICY "Clients can insert own profile"
ON public.client_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Tradespeople need to read client names/contact details for their bookings.
DROP POLICY IF EXISTS "Pros can view client profiles for their bookings" ON public.client_profiles;
CREATE POLICY "Pros can view client profiles for their bookings"
ON public.client_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_bookings b
    WHERE b.client_id = id
      AND b.tradesperson_id = auth.uid()
  )
);

-- ── tradesperson_profiles ──────────────────────────────────────────────────────

-- Tradesperson profiles are public marketplace listings.
DROP POLICY IF EXISTS "Anyone can view tradesperson profiles" ON public.tradesperson_profiles;
CREATE POLICY "Anyone can view tradesperson profiles"
ON public.tradesperson_profiles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Pros can update own profile" ON public.tradesperson_profiles;
CREATE POLICY "Pros can update own profile"
ON public.tradesperson_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Pros can insert own profile" ON public.tradesperson_profiles;
CREATE POLICY "Pros can insert own profile"
ON public.tradesperson_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
