-- Enable Supabase Realtime (postgres_changes) for bookings, messaging, the
-- pro activity feed, and shopping orders.
-- Existing RLS SELECT policies (client_bookings_rls_policies.sql,
-- conversations_rls_policies.sql) already scope rows per-user, so Realtime
-- will only deliver rows the connected user is allowed to see. If pros can't
-- see their own live order updates, check that client_shopping has a
-- non-admin SELECT policy scoped to tradesperson_id = auth.uid() — only an
-- admin-only policy was found in this repo's SQL files.
-- Run in Supabase SQL Editor. Safe to re-run.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_bookings', 'conversations', 'conversations_msg', 'client_activity', 'client_shopping']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
