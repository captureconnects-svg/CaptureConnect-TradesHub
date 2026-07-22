-- Security fix (audit 2026-07-20): landing_testimonials had NO row-level
-- security. Combined with deleteTestimonial() in src/backend/testimonials.ts
-- having no auth/ownership check, any authenticated user could delete any
-- other user's testimonial, or directly PATCH their own pending testimonial
-- to status = 'approved' and have it appear on the public landing page,
-- bypassing admin moderation entirely.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Depends on public.is_admin(), defined in admin_rls_policies.sql.

ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;

-- Public landing page: anyone (including signed-out visitors) can see
-- approved testimonials.
DROP POLICY IF EXISTS "Anyone can view approved testimonials" ON public.landing_testimonials;
CREATE POLICY "Anyone can view approved testimonials"
ON public.landing_testimonials FOR SELECT TO anon, authenticated
USING (status = 'approved');

-- Submitters can see their own testimonial regardless of status (pending/rejected).
DROP POLICY IF EXISTS "Users can view own testimonials" ON public.landing_testimonials;
CREATE POLICY "Users can view own testimonials"
ON public.landing_testimonials FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Users may only ever submit their own testimonial, and only in 'pending'
-- status — approval is admin-only via UPDATE below.
DROP POLICY IF EXISTS "Users can submit own testimonial" ON public.landing_testimonials;
CREATE POLICY "Users can submit own testimonial"
ON public.landing_testimonials FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins can update testimonials" ON public.landing_testimonials;
CREATE POLICY "Admins can update testimonials"
ON public.landing_testimonials FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Owners and admins can delete testimonials" ON public.landing_testimonials;
CREATE POLICY "Owners and admins can delete testimonials"
ON public.landing_testimonials FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
