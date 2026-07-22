-- Security fix (audit 2026-07-20): verification_request and
-- verification_documents had NO row-level security at all — access was
-- gated only by the client-side requireAdminRole() check in
-- src/backend/admin.ts, which does nothing to stop a direct Supabase REST
-- call. Any authenticated user could read/update any user's verification
-- request (including self-approving their own "verified" badge by PATCHing
-- status to 'approved') and read any user's uploaded ID/certificate
-- documents.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Depends on public.is_admin(), defined in admin_rls_policies.sql.

-- ── verification_request ──────────────────────────────────────────────────
ALTER TABLE public.verification_request ENABLE ROW LEVEL SECURITY;

-- Note: verification_request.user_id is `text`, not `uuid`, on this
-- project's schema — hence the explicit auth.uid()::text casts below.
DROP POLICY IF EXISTS "Users can view own verification request" ON public.verification_request;
CREATE POLICY "Users can view own verification request"
ON public.verification_request FOR SELECT TO authenticated
USING (user_id = auth.uid()::text OR public.is_admin());

-- Users may only ever create their own request, and only in 'pending' status
-- — status transitions (approved/rejected) are admin-only via UPDATE below.
DROP POLICY IF EXISTS "Users can submit own verification request" ON public.verification_request;
CREATE POLICY "Users can submit own verification request"
ON public.verification_request FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()::text AND status = 'pending');

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_request;
CREATE POLICY "Admins can update verification requests"
ON public.verification_request FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete verification requests" ON public.verification_request;
CREATE POLICY "Admins can delete verification requests"
ON public.verification_request FOR DELETE TO authenticated
USING (public.is_admin());

-- ── verification_documents ────────────────────────────────────────────────
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification documents" ON public.verification_documents;
CREATE POLICY "Users can view own verification documents"
ON public.verification_documents FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.verification_request vr
    WHERE vr.id = verification_documents.request_id AND vr.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can upload own verification documents" ON public.verification_documents;
CREATE POLICY "Users can upload own verification documents"
ON public.verification_documents FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.verification_request vr
    WHERE vr.id = verification_documents.request_id AND vr.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Admins can delete verification documents" ON public.verification_documents;
CREATE POLICY "Admins can delete verification documents"
ON public.verification_documents FOR DELETE TO authenticated
USING (public.is_admin());
