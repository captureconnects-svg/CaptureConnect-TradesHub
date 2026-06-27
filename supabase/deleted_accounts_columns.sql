-- Run this migration in Supabase SQL Editor to extend the deleted_accounts table.
-- These columns are required for tracking who was deleted, what type of user they
-- were, who deleted them, and when they originally joined.

ALTER TABLE public.deleted_accounts
  ADD COLUMN IF NOT EXISTS full_name   text,
  ADD COLUMN IF NOT EXISTS user_type   text,  -- 'client' or 'tradesperson'
  ADD COLUMN IF NOT EXISTS deleted_by  text,  -- 'self' or 'admin'
  ADD COLUMN IF NOT EXISTS joined_at   timestamptz;

-- Optional: add an index so the sign-in deleted-account check is fast
CREATE INDEX IF NOT EXISTS deleted_accounts_user_id_idx ON public.deleted_accounts (user_id);
