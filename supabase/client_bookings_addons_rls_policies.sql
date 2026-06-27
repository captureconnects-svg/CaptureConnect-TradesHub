-- RLS policies for "client_bookings.AddOns".
-- Clients can insert add-ons only for bookings they own.
-- Both the client and the assigned tradesperson can read add-ons.
-- Admins can read all add-ons.
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public."client_bookings.AddOns" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can insert addons for own bookings"   ON public."client_bookings.AddOns";
DROP POLICY IF EXISTS "Clients can view addons for own bookings"     ON public."client_bookings.AddOns";
DROP POLICY IF EXISTS "Pros can view addons for their bookings"      ON public."client_bookings.AddOns";
DROP POLICY IF EXISTS "Admins can view all addons"                   ON public."client_bookings.AddOns";

-- Clients may only insert add-ons for bookings they own.
CREATE POLICY "Clients can insert addons for own bookings"
ON public."client_bookings.AddOns" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_bookings b
    WHERE b.id = booking_id
      AND b.client_id = auth.uid()
  )
);

-- Clients can read add-ons attached to their own bookings.
CREATE POLICY "Clients can view addons for own bookings"
ON public."client_bookings.AddOns" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_bookings b
    WHERE b.id = booking_id
      AND b.client_id = auth.uid()
  )
);

-- Tradespeople can read add-ons for bookings assigned to them.
CREATE POLICY "Pros can view addons for their bookings"
ON public."client_bookings.AddOns" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_bookings b
    WHERE b.id = booking_id
      AND b.tradesperson_id = auth.uid()
  )
);

-- Admins and super_admins can read all add-ons.
CREATE POLICY "Admins can view all addons"
ON public."client_bookings.AddOns" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
);
