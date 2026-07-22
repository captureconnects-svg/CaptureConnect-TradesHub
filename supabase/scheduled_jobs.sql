-- ============================================================
-- Schedules the retry/cleanup Edge Functions that were previously only ever
-- triggered manually. This is what was missing: reconcile-pending-payments
-- and cleanup-abandoned-orders both exist and work, but nothing was ever
-- calling them on a recurring basis, so reconciliation retries and abandoned
-- shopping-cart cleanup never actually happened after the first attempt.
--
-- Also schedules notify-payout-ready (see that function +
-- payout_ready_admin_alert.sql), which alerts the admin by email once a
-- payment's escrow hold period has ended and a payout is due — without
-- this, payments_ready_for_payout is a passive view nobody was polling.
--
-- Uses pg_cron (scheduling) + pg_net (HTTP calls from Postgres) + Vault (so
-- the cron secret never appears in this file or in git — it's stored
-- encrypted in the database and only referenced by name below).
--
-- ── One-time setup before running this file ──────────────────────────────
-- Run this once in the SQL Editor, substituting the actual CRON_SECRET value
-- (already set as an Edge Function secret via `supabase secrets set
-- CRON_SECRET=...`) — do NOT commit this statement with the real value to
-- git, run it directly in the SQL Editor and discard it:
--
--   select vault.create_secret('<the CRON_SECRET value>', 'cron_secret');
--
-- Safe to re-run after that. Run in Supabase SQL Editor.
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Retry Stripe fee reconciliation every 10 minutes — catches payments whose
-- Balance Transaction wasn't attached yet at payment_intent.succeeded time.
select cron.unschedule(jobid) from cron.job where jobname = 'reconcile-pending-payments';
select cron.schedule(
  'reconcile-pending-payments',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://lrevktrgugohikjbimem.supabase.co/functions/v1/reconcile-pending-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Sweep abandoned (never-paid) shopping-cart drafts once an hour — the
-- 24-hour age threshold is enforced inside the function itself.
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-abandoned-orders';
select cron.schedule(
  'cleanup-abandoned-orders',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lrevktrgugohikjbimem.supabase.co/functions/v1/cleanup-abandoned-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Check every 30 minutes for payments that have just cleared their escrow
-- hold period, and email the admin a summary if any are found.
select cron.unschedule(jobid) from cron.job where jobname = 'notify-payout-ready';
select cron.schedule(
  'notify-payout-ready',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://lrevktrgugohikjbimem.supabase.co/functions/v1/notify-payout-ready',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify: should list all three jobs with schedule '*/10 * * * *', '0 * * * *' and '*/30 * * * *'.
select jobid, jobname, schedule, active from cron.job where jobname in ('reconcile-pending-payments', 'cleanup-abandoned-orders', 'notify-payout-ready');
