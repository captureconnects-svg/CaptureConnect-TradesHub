-- RLS SELECT policies for client_bookings.
-- Run this in the Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run: drops any existing policies with these names first.

-- ── Drop existing SELECT policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view own bookings"           ON public.client_bookings;
DROP POLICY IF EXISTS "Pros can view bookings for their jobs"   ON public.client_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings"            ON public.client_bookings;

-- Make sure RLS is enabled on the table.
ALTER TABLE public.client_bookings ENABLE ROW LEVEL SECURITY;

-- 1. Clients can read their own bookings.
CREATE POLICY "Clients can view own bookings"
ON public.client_bookings FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- 2. Tradespeople can read bookings assigned to them.
CREATE POLICY "Pros can view bookings for their jobs"
ON public.client_bookings FOR SELECT
TO authenticated
USING (tradesperson_id = auth.uid());

-- 3. Admins and super_admins can read all bookings.
CREATE POLICY "Admins can view all bookings"
ON public.client_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
);
