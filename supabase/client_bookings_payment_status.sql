-- Adds payment_status + refunded columns and all UPDATE/INSERT RLS policies for client_bookings.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ── Columns ───────────────────────────────────────────────────────────────────
ALTER TABLE public.client_bookings
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT NULL;

ALTER TABLE public.client_bookings
  ADD COLUMN IF NOT EXISTS refunded boolean NOT NULL DEFAULT false;

-- ── Drop old policies ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can update payment status"       ON public.client_bookings;
DROP POLICY IF EXISTS "Clients can insert own bookings"         ON public.client_bookings;
DROP POLICY IF EXISTS "Pros can update their bookings"          ON public.client_bookings;
DROP POLICY IF EXISTS "Admins can update all bookings"          ON public.client_bookings;

-- ── INSERT: clients can create bookings ──────────────────────────────────────
CREATE POLICY "Clients can insert own bookings"
ON public.client_bookings FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- ── UPDATE: clients can update their own bookings (cancel, pay) ───────────────
CREATE POLICY "Clients can update payment status"
ON public.client_bookings FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

-- ── UPDATE: pros can update bookings assigned to them (confirm, reschedule) ───
CREATE POLICY "Pros can update their bookings"
ON public.client_bookings FOR UPDATE
TO authenticated
USING (tradesperson_id = auth.uid())
WITH CHECK (tradesperson_id = auth.uid());

-- ── UPDATE: admins can update all bookings ────────────────────────────────────
CREATE POLICY "Admins can update all bookings"
ON public.client_bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid() AND a.role IN ('admin', 'super_admin')
  )
);
