-- Write policies for client_bookings.
-- Complements the SELECT-only policies in client_bookings_rls_policies.sql.
-- Run in Supabase SQL Editor. Safe to re-run.

-- Clients can create bookings only on their own behalf.
DROP POLICY IF EXISTS "Clients can insert own bookings" ON public.client_bookings;
CREATE POLICY "Clients can insert own bookings"
ON public.client_bookings FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- Assigned tradesperson can update status/payment on their bookings.
DROP POLICY IF EXISTS "Pros can update own bookings" ON public.client_bookings;
CREATE POLICY "Pros can update own bookings"
ON public.client_bookings FOR UPDATE
TO authenticated
USING (tradesperson_id = auth.uid())
WITH CHECK (tradesperson_id = auth.uid());

-- Clients can update only their own bookings (e.g. reschedule requests).
DROP POLICY IF EXISTS "Clients can update own bookings" ON public.client_bookings;
CREATE POLICY "Clients can update own bookings"
ON public.client_bookings FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

-- Only admins may delete bookings.
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.client_bookings;
CREATE POLICY "Admins can delete bookings"
ON public.client_bookings FOR DELETE
TO authenticated
USING (public.is_admin());

-- Admins can update any booking (status overrides, refunds).
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.client_bookings;
CREATE POLICY "Admins can update all bookings"
ON public.client_bookings FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
