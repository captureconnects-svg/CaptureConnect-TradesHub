-- User-scoped RLS policies for conversations and conversations_msg.
-- Participants can only read/write conversations and messages they belong to.
-- Admin SELECT policies are already in admin_rls_policies.sql.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ── conversations ──────────────────────────────────────────────────────────────

-- Only the client in the conversation can open it (tradesperson is assigned, not creator).
DROP POLICY IF EXISTS "Clients can create conversations" ON public.conversations;
CREATE POLICY "Clients can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- Both participants can view their own conversations.
DROP POLICY IF EXISTS "Participants can view own conversations" ON public.conversations;
CREATE POLICY "Participants can view own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR tradesperson_id = auth.uid());

-- Both participants can update last_msg_at.
DROP POLICY IF EXISTS "Participants can update own conversations" ON public.conversations;
CREATE POLICY "Participants can update own conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (client_id = auth.uid() OR tradesperson_id = auth.uid())
WITH CHECK (client_id = auth.uid() OR tradesperson_id = auth.uid());

-- ── conversations_msg ──────────────────────────────────────────────────────────

ALTER TABLE public.conversations_msg ENABLE ROW LEVEL SECURITY;

-- Only participants can read messages in a conversation.
DROP POLICY IF EXISTS "Participants can view messages" ON public.conversations_msg;
CREATE POLICY "Participants can view messages"
ON public.conversations_msg FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = convo_id
      AND (c.client_id = auth.uid() OR c.tradesperson_id = auth.uid())
  )
);

-- Only participants can send messages, and the sender_id must match auth.uid().
DROP POLICY IF EXISTS "Participants can send messages" ON public.conversations_msg;
CREATE POLICY "Participants can send messages"
ON public.conversations_msg FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = convo_id
      AND (c.client_id = auth.uid() OR c.tradesperson_id = auth.uid())
  )
);

-- Admins can view all messages (complements admin_rls_policies.sql).
DROP POLICY IF EXISTS "Admins can view all messages" ON public.conversations_msg;
CREATE POLICY "Admins can view all messages"
ON public.conversations_msg FOR SELECT
TO authenticated
USING (public.is_admin());
