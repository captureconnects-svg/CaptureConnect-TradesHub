-- Closes the read-access half of the "deleted user" gap found in the
-- 2026-07-21 follow-up security review: deleteAdminUser() (src/backend/admin.ts)
-- deletes client_profiles/tradesperson_profiles but was never able to revoke
-- the person's Supabase Auth session on its own (that needs the service-role
-- key — see the new delete-user-account edge function, called from
-- deleteAdminUser as of this same change). Even with that fixed, a session
-- token issued before deletion stays cryptographically valid until it
-- expires, because Supabase access tokens are stateless JWTs — PostgREST
-- checks the signature, not live auth.users/profile state. These policies
-- close that residual window at the RLS layer instead: a deleted user's own
-- historical rows stop matching the moment their profile row is gone, no
-- matter how long their old token has left to live.
--
-- Each policy only checks the *acting* party's own profile, not the
-- counterparty's — e.g. a pro can still see a booking from a client who was
-- later deleted (their own job history is unaffected); only the deleted
-- client themselves loses access to it. Admin ("is_admin()"/"Admins can view
-- all ...") policies are untouched — admins retain full visibility for
-- audit/financial-reporting purposes, same as the deleted_accounts tombstone
-- pattern already relies on elsewhere.

-- ── client_bookings ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.client_bookings;
CREATE POLICY "Clients can view own bookings" ON public.client_bookings
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros can view bookings for their jobs" ON public.client_bookings;
CREATE POLICY "Pros can view bookings for their jobs" ON public.client_bookings
  FOR SELECT TO authenticated
  USING (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

-- ── client_shopping ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view own orders" ON public.client_shopping;
CREATE POLICY "Clients can view own orders" ON public.client_shopping
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros can view own orders" ON public.client_shopping;
CREATE POLICY "Pros can view own orders" ON public.client_shopping
  FOR SELECT TO authenticated
  USING (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

-- ── payments ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view own payments" ON public.payments;
CREATE POLICY "Clients can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = auth.uid())
  );

DROP POLICY IF EXISTS "Providers can view own payments" ON public.payments;
CREATE POLICY "Providers can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    provider_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

-- ── return_request ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_read_own_return_request" ON public.return_request;
CREATE POLICY "clients_read_own_return_request" ON public.return_request
  FOR SELECT TO authenticated
  USING (
    auth.uid() = client_id
    AND EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = auth.uid())
  );

DROP POLICY IF EXISTS "pros_read_their_return_requests" ON public.return_request;
CREATE POLICY "pros_read_their_return_requests" ON public.return_request
  FOR SELECT TO authenticated
  USING (
    auth.uid() = tradesperson_id
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

-- ── tradesperson_stripe_accounts ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Pros can view own Stripe account" ON public.tradesperson_stripe_accounts;
CREATE POLICY "Pros can view own Stripe account" ON public.tradesperson_stripe_accounts
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

-- ── tradesperson_banking_details ─────────────────────────────────────────────
-- Highest-sensitivity table here (bank account number + home address), so
-- every command is tightened, not just SELECT.
DROP POLICY IF EXISTS "Pros can view own banking details" ON public.tradesperson_banking_details;
CREATE POLICY "Pros can view own banking details" ON public.tradesperson_banking_details
  FOR SELECT TO authenticated
  USING (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros can insert own banking details" ON public.tradesperson_banking_details;
CREATE POLICY "Pros can insert own banking details" ON public.tradesperson_banking_details
  FOR INSERT TO authenticated
  WITH CHECK (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros can update own banking details" ON public.tradesperson_banking_details;
CREATE POLICY "Pros can update own banking details" ON public.tradesperson_banking_details
  FOR UPDATE TO authenticated
  USING (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  )
  WITH CHECK (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros can delete own banking details" ON public.tradesperson_banking_details;
CREATE POLICY "Pros can delete own banking details" ON public.tradesperson_banking_details
  FOR DELETE TO authenticated
  USING (
    tradesperson_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tradesperson_profiles tp WHERE tp.id = auth.uid())
  );
