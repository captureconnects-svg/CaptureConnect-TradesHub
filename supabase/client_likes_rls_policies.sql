-- Security fix (audit 2026-07-20): client_likes had NO row-level security,
-- and toggleClientLike() in src/backend/client-likes.ts trusted a
-- caller-supplied clientId instead of the session, letting any authenticated
-- user like/unlike tradespeople on behalf of an arbitrary client_id (IDOR).
-- The RLS below is the real fix (enforced regardless of what the client
-- sends); toggleClientLike() was also updated to verify the caller owns the
-- clientId it's passed.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

ALTER TABLE public.client_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own likes" ON public.client_likes;
CREATE POLICY "Clients can view own likes"
ON public.client_likes FOR SELECT TO authenticated
USING (client_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Clients can like as themselves" ON public.client_likes;
CREATE POLICY "Clients can like as themselves"
ON public.client_likes FOR INSERT TO authenticated
WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can unlike own likes" ON public.client_likes;
CREATE POLICY "Clients can unlike own likes"
ON public.client_likes FOR DELETE TO authenticated
USING (client_id = auth.uid());
