-- Adds country and currency to tradesperson_banking_details.
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.tradesperson_banking_details
  ADD COLUMN IF NOT EXISTS country  text,
  ADD COLUMN IF NOT EXISTS currency text;
