-- Security fix (audit 2026-07-20, follow-up) — see
-- fix_stray_open_policies_drop_only.sql for the full explanation of the
-- `FOR ALL TO public USING (true)` policies found across this project.
--
-- Unlike that file, the tables below have NO other policy backing them —
-- the wide-open one is the *only* policy, so a plain DROP would leave RLS
-- enabled with zero policies (full deny-all), breaking real app
-- functionality. These get a proper replacement instead.
--
-- Also re-applies contact_request_rls_policies.sql's intent (a stray
-- "contact"/public/true policy was found coexisting with it in production,
-- meaning contact form submissions have been fully public read/write, not
-- admin-gated as that file's comment claims).
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Depends on public.is_admin(), defined in admin_rls_policies.sql.

-- ── client_activity ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activity" ON public.client_activity;
ALTER TABLE public.client_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros can view own activity feed" ON public.client_activity;
CREATE POLICY "Pros can view own activity feed"
ON public.client_activity FOR SELECT TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can log their own activity" ON public.client_activity;
CREATE POLICY "Users can log their own activity"
ON public.client_activity FOR INSERT TO authenticated
WITH CHECK (client_id IS NULL OR client_id = auth.uid());

-- ── client_bookings.AddOns ──────────────────────────────────────────────
DROP POLICY IF EXISTS "addon" ON public."client_bookings.AddOns";
ALTER TABLE public."client_bookings.AddOns" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can view addons" ON public."client_bookings.AddOns";
CREATE POLICY "Booking participants can view addons"
ON public."client_bookings.AddOns" FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.client_bookings b
    WHERE b.id = "client_bookings.AddOns".booking_id
      AND (b.client_id = auth.uid() OR b.tradesperson_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Clients can add addons to own bookings" ON public."client_bookings.AddOns";
CREATE POLICY "Clients can add addons to own bookings"
ON public."client_bookings.AddOns" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_bookings b
    WHERE b.id = "client_bookings.AddOns".booking_id AND b.client_id = auth.uid()
  )
);

-- ── client_shopping.ITEMS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "shpping" ON public."client_shopping.ITEMS";
ALTER TABLE public."client_shopping.ITEMS" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order participants can view items" ON public."client_shopping.ITEMS";
CREATE POLICY "Order participants can view items"
ON public."client_shopping.ITEMS" FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.client_shopping o
    WHERE o.id = "client_shopping.ITEMS".shopping_id
      AND (o.client_id = auth.uid() OR o.tradesperson_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Clients can add items to own orders" ON public."client_shopping.ITEMS";
CREATE POLICY "Clients can add items to own orders"
ON public."client_shopping.ITEMS" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_shopping o
    WHERE o.id = "client_shopping.ITEMS".shopping_id AND o.client_id = auth.uid()
  )
);

-- ── return_requestEvidence ──────────────────────────────────────────────
DROP POLICY IF EXISTS "RETURN" ON public."return_requestEvidence";
ALTER TABLE public."return_requestEvidence" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Return-request participants can view evidence" ON public."return_requestEvidence";
CREATE POLICY "Return-request participants can view evidence"
ON public."return_requestEvidence" FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.return_request rr
    WHERE rr.id = "return_requestEvidence".request_id
      AND (rr.client_id = auth.uid() OR rr.tradesperson_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Clients can upload evidence for own requests" ON public."return_requestEvidence";
CREATE POLICY "Clients can upload evidence for own requests"
ON public."return_requestEvidence" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.return_request rr
    WHERE rr.id = "return_requestEvidence".request_id AND rr.client_id = auth.uid()
  )
);

-- ── contact_request ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact" ON public.contact_request;
ALTER TABLE public.contact_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_request;
CREATE POLICY "Anyone can submit a contact request"
ON public.contact_request FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact requests" ON public.contact_request;
CREATE POLICY "Admins can view contact requests"
ON public.contact_request FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_request;
CREATE POLICY "Admins can update contact requests"
ON public.contact_request FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ── Public marketplace listing tables ───────────────────────────────────
-- Same pattern for all six: anyone can browse (needed for the public
-- marketplace/booking flow), only the owning pro (or admin) can write.
-- tradesperson_packages and tradesperson_addOns are the most important of
-- these to lock down — they are the source-of-truth price tables that
-- create-payment-intent now trusts (see pricing_and_status_tamper_guard.sql
-- and the create-payment-intent redeploy); if either stayed publicly
-- writable, the price-tampering fix would be trivially bypassed by editing
-- the package/add-on price directly instead of the booking's total_price.

DROP POLICY IF EXISTS "package" ON public.tradesperson_packages;
ALTER TABLE public.tradesperson_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view packages" ON public.tradesperson_packages;
CREATE POLICY "Anyone can view packages"
ON public.tradesperson_packages FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own packages" ON public.tradesperson_packages;
CREATE POLICY "Pros can manage own packages"
ON public.tradesperson_packages FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "addOns" ON public."tradesperson_addOns";
ALTER TABLE public."tradesperson_addOns" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view addons" ON public."tradesperson_addOns";
CREATE POLICY "Anyone can view addons"
ON public."tradesperson_addOns" FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own addons" ON public."tradesperson_addOns";
CREATE POLICY "Pros can manage own addons"
ON public."tradesperson_addOns" FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "FAQ" ON public."tradesperson_FAQ";
ALTER TABLE public."tradesperson_FAQ" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view FAQs" ON public."tradesperson_FAQ";
CREATE POLICY "Anyone can view FAQs"
ON public."tradesperson_FAQ" FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own FAQs" ON public."tradesperson_FAQ";
CREATE POLICY "Pros can manage own FAQs"
ON public."tradesperson_FAQ" FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "certification" ON public.tradesperson_certification;
ALTER TABLE public.tradesperson_certification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view certifications" ON public.tradesperson_certification;
CREATE POLICY "Anyone can view certifications"
ON public.tradesperson_certification FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own certifications" ON public.tradesperson_certification;
CREATE POLICY "Pros can manage own certifications"
ON public.tradesperson_certification FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "specialty" ON public.tradesperson_specialty;
ALTER TABLE public.tradesperson_specialty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view specialties" ON public.tradesperson_specialty;
CREATE POLICY "Anyone can view specialties"
ON public.tradesperson_specialty FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own specialties" ON public.tradesperson_specialty;
CREATE POLICY "Pros can manage own specialties"
ON public.tradesperson_specialty FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "workDays" ON public."tradesperson_WorkDays";
ALTER TABLE public."tradesperson_WorkDays" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view work days" ON public."tradesperson_WorkDays";
CREATE POLICY "Anyone can view work days"
ON public."tradesperson_WorkDays" FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own work days" ON public."tradesperson_WorkDays";
CREATE POLICY "Pros can manage own work days"
ON public."tradesperson_WorkDays" FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "portfolio" ON public.tradesperson_portfolios;
ALTER TABLE public.tradesperson_portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view portfolios" ON public.tradesperson_portfolios;
CREATE POLICY "Anyone can view portfolios"
ON public.tradesperson_portfolios FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own portfolios" ON public.tradesperson_portfolios;
CREATE POLICY "Pros can manage own portfolios"
ON public.tradesperson_portfolios FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());

-- tradesperson_port.media has no tradesperson_id of its own — ownership is
-- via its parent portfolio row.
DROP POLICY IF EXISTS "portfolio media" ON public."tradesperson_port.media";
ALTER TABLE public."tradesperson_port.media" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view portfolio media" ON public."tradesperson_port.media";
CREATE POLICY "Anyone can view portfolio media"
ON public."tradesperson_port.media" FOR SELECT TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own portfolio media" ON public."tradesperson_port.media";
CREATE POLICY "Pros can manage own portfolio media"
ON public."tradesperson_port.media" FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.tradesperson_portfolios p
    WHERE p.id = "tradesperson_port.media".portfolio_id AND p.tradesperson_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.tradesperson_portfolios p
    WHERE p.id = "tradesperson_port.media".portfolio_id AND p.tradesperson_id = auth.uid()
  )
);

-- Discount codes: not shown on public marketplace pages, only used inside
-- the authenticated checkout flow, so SELECT is authenticated-only (not anon).
DROP POLICY IF EXISTS "Discounts" ON public."tradesperson_discountCode";
ALTER TABLE public."tradesperson_discountCode" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view discount codes" ON public."tradesperson_discountCode";
CREATE POLICY "Authenticated users can view discount codes"
ON public."tradesperson_discountCode" FOR SELECT TO authenticated
USING (true);
DROP POLICY IF EXISTS "Pros can manage own discount codes" ON public."tradesperson_discountCode";
CREATE POLICY "Pros can manage own discount codes"
ON public."tradesperson_discountCode" FOR ALL TO authenticated
USING (tradesperson_id = auth.uid() OR public.is_admin())
WITH CHECK (tradesperson_id = auth.uid() OR public.is_admin());
