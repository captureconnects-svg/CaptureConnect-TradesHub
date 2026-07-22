-- Drops the unused tradesperson_bank_details table. It was created before
-- tradesperson_banking_details (the table actually built via the Supabase
-- Table Editor and now wired up in the app) and never received any data.
-- Run in Supabase SQL Editor.

DROP TABLE IF EXISTS public.tradesperson_bank_details;
