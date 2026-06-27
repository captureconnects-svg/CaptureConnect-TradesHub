-- RLS policies granting admins read access to tables that the admin dashboard queries.
-- These enforce access at the database level in addition to the JS-layer requireAdminRole() check.
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

-- Helper: returns true when the calling auth.uid() belongs to an admin or super_admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  );
$$;

-- ── client_profiles ────────────────────────────────────────────────────────────
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all client profiles" ON public.client_profiles;
CREATE POLICY "Admins can view all client profiles"
ON public.client_profiles FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update client profiles" ON public.client_profiles;
CREATE POLICY "Admins can update client profiles"
ON public.client_profiles FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete client profiles" ON public.client_profiles;
CREATE POLICY "Admins can delete client profiles"
ON public.client_profiles FOR DELETE TO authenticated
USING (public.is_admin());

-- ── tradesperson_profiles ──────────────────────────────────────────────────────
ALTER TABLE public.tradesperson_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all tradesperson profiles" ON public.tradesperson_profiles;
CREATE POLICY "Admins can view all tradesperson profiles"
ON public.tradesperson_profiles FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update tradesperson profiles" ON public.tradesperson_profiles;
CREATE POLICY "Admins can update tradesperson profiles"
ON public.tradesperson_profiles FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete tradesperson profiles" ON public.tradesperson_profiles;
CREATE POLICY "Admins can delete tradesperson profiles"
ON public.tradesperson_profiles FOR DELETE TO authenticated
USING (public.is_admin());

-- ── client_shopping (orders) ───────────────────────────────────────────────────
ALTER TABLE public.client_shopping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all orders" ON public.client_shopping;
CREATE POLICY "Admins can view all orders"
ON public.client_shopping FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.client_shopping;
CREATE POLICY "Admins can update orders"
ON public.client_shopping FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.client_shopping;
CREATE POLICY "Admins can delete orders"
ON public.client_shopping FOR DELETE TO authenticated
USING (public.is_admin());

-- ── client_reviews ─────────────────────────────────────────────────────────────
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all reviews" ON public.client_reviews;
CREATE POLICY "Admins can view all reviews"
ON public.client_reviews FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.client_reviews;
CREATE POLICY "Admins can delete reviews"
ON public.client_reviews FOR DELETE TO authenticated
USING (public.is_admin());

-- ── conversations ──────────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_admin());

-- ── audit_logs ─────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (public.is_admin());
