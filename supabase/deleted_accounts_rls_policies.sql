-- Security fix (audit 2026-07-20): deleted_accounts had NO row-level
-- security. This table stores full_name/email/username/role for every
-- deleted user (tombstones written by both self-service account deletion in
-- src/backend/account-settings.ts and admin deletion in src/backend/admin.ts),
-- so any authenticated user could dump every deleted user's PII with an
-- unfiltered SELECT.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Depends on public.is_admin(), defined in admin_rls_policies.sql.

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

-- client-auth.ts / pro-auth.ts check "was I deleted?" by user_id on login;
-- the admin dashboard needs to see all tombstones.
DROP POLICY IF EXISTS "Users can view own deleted-account record" ON public.deleted_accounts;
CREATE POLICY "Users can view own deleted-account record"
ON public.deleted_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Self-service deletion (account-settings.ts) inserts as the deleting user;
-- admin deletion (admin.ts) inserts as the admin on behalf of the target user.
DROP POLICY IF EXISTS "Users can tombstone own account" ON public.deleted_accounts;
CREATE POLICY "Users can tombstone own account"
ON public.deleted_accounts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete tombstone records" ON public.deleted_accounts;
CREATE POLICY "Admins can delete tombstone records"
ON public.deleted_accounts FOR DELETE TO authenticated
USING (public.is_admin());
