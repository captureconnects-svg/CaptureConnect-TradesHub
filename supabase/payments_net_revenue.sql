-- Net-revenue breakdown for the payments ledger: what Stripe actually took,
-- what the platform nets from the service fee after Stripe's cut, and what
-- the pro is owed after commission.
--
-- service_fee_amount is known and stored at checkout (create-payment-intent).
-- The rest can only be computed once Stripe settles the charge (Stripe's fee
-- isn't known before then), so they're populated by the stripe-webhook
-- function's payment_intent.succeeded handler and never recalculated
-- afterwards even if platform_settings changes later.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

-- pro_commission_amount was renamed to platform_commission_amount by
-- payments_commission_revenue_rename.sql (the platform receives this
-- commission out of the pro's base amount — it was never the pro's money) —
-- created directly under the final name here for fresh installs.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS service_fee_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_fee_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS platform_net_service_fee numeric(10, 2),
  ADD COLUMN IF NOT EXISTS platform_commission_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS pro_payout_amount numeric(10, 2);
