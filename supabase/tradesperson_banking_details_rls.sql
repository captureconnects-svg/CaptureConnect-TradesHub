-- RLS policies for tradesperson_banking_details (created via the Supabase
-- Table Editor with RLS enabled but zero policies, which denies all access
-- by default). One row per pro, keyed by tradesperson_id (not a unique/PK
-- constraint — app code looks up the existing row by tradesperson_id before
-- deciding insert vs update). Holds sensitive financial PII (account number,
-- address, phone tied to the bank account), so access is locked to the
-- owning pro plus admins.
--
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.tradesperson_banking_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros can view own banking details"   ON public.tradesperson_banking_details;
DROP POLICY IF EXISTS "Pros can insert own banking details" ON public.tradesperson_banking_details;
DROP POLICY IF EXISTS "Pros can update own banking details" ON public.tradesperson_banking_details;
DROP POLICY IF EXISTS "Pros can delete own banking details" ON public.tradesperson_banking_details;
DROP POLICY IF EXISTS "Admins can view all banking details" ON public.tradesperson_banking_details;

CREATE POLICY "Pros can view own banking details"
ON public.tradesperson_banking_details FOR SELECT TO authenticated
USING (tradesperson_id = auth.uid());

CREATE POLICY "Pros can insert own banking details"
ON public.tradesperson_banking_details FOR INSERT TO authenticated
WITH CHECK (tradesperson_id = auth.uid());

CREATE POLICY "Pros can update own banking details"
ON public.tradesperson_banking_details FOR UPDATE TO authenticated
USING (tradesperson_id = auth.uid())
WITH CHECK (tradesperson_id = auth.uid());

CREATE POLICY "Pros can delete own banking details"
ON public.tradesperson_banking_details FOR DELETE TO authenticated
USING (tradesperson_id = auth.uid());

CREATE POLICY "Admins can view all banking details"
ON public.tradesperson_banking_details FOR SELECT TO authenticated
USING (public.is_admin());
