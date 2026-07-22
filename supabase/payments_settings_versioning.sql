-- Records the exact platform_settings values that were active when a payment
-- was created, so later admin changes never retroactively alter historical
-- payments. Populated once by create-payment-intent at PaymentIntent
-- creation time and never updated afterwards.
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

-- pro_commission_percent_used was renamed to platform_commission_percent_used
-- by payments_commission_revenue_rename.sql, then dropped entirely by
-- payments_drop_commission_percent_used.sql (redundant with
-- platform_commission_amount/base_amount and never read anywhere) — not
-- re-added here so re-running this script can't resurrect it.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS client_fee_percent_used numeric(5, 2),
  ADD COLUMN IF NOT EXISTS payout_hold_days_used integer,
  ADD COLUMN IF NOT EXISTS platform_settings_version integer;
