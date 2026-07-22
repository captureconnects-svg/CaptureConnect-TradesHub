-- ============================================================
-- Stripe Connect (Express) account tracking for tradespeople.
--
-- One row per pro, created lazily the first time they start onboarding.
-- Kept as its own table rather than columns on tradesperson_profiles because
-- that profile row is already broadly readable (clients/admins browse it) —
-- payout-enablement flags and the Stripe account id are payment-domain data
-- that shouldn't ride along on an otherwise-public profile row.
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tradesperson_stripe_accounts (
  id                         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connect_account_id text        UNIQUE,
  details_submitted         boolean     NOT NULL DEFAULT false,
  charges_enabled            boolean     NOT NULL DEFAULT false,
  payouts_enabled            boolean     NOT NULL DEFAULT false,
  disabled_reason            text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tradesperson_stripe_accounts_connect_id_idx
  ON public.tradesperson_stripe_accounts(stripe_connect_account_id);

ALTER TABLE public.tradesperson_stripe_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros can view own Stripe account"   ON public.tradesperson_stripe_accounts;
DROP POLICY IF EXISTS "Admins can view all Stripe accounts" ON public.tradesperson_stripe_accounts;

-- Reads only. All writes happen via the create-connect-account / stripe-webhook
-- Edge Functions using the service role key, which bypasses RLS — no
-- INSERT/UPDATE policy is granted to the authenticated role on purpose.
CREATE POLICY "Pros can view own Stripe account"
ON public.tradesperson_stripe_accounts FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all Stripe accounts"
ON public.tradesperson_stripe_accounts FOR SELECT TO authenticated
USING (public.is_admin());
