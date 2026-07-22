-- ============================================================
-- Financial reconciliation ledger upgrade for public.payments.
--
-- Turns the payments table into a complete financial ledger: exact Stripe
-- fees (never estimated, pulled from the charge's Balance Transaction),
-- immutable platform-calculation snapshots taken at checkout time, and the
-- payout/escrow state needed by the Stripe Connect release-payout engine.
--
-- Safe to re-run. Run in Supabase SQL Editor after stripe_payments_table.sql,
-- payments_net_revenue.sql and payments_settings_versioning.sql have been run.
-- ============================================================

-- ── 1. Rename columns that predate this ledger upgrade ──────────────────────
-- Nothing in the application reads these column names yet (the pro-dashboard
-- Payments view is still mock data, and no admin UI exists), so renaming is
-- safe and avoids carrying two names for the same concept forever.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stripe_fee_amount'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN stripe_fee_amount TO stripe_total_fee;
  END IF;

  -- platform_net_service_fee was briefly renamed to platform_net_revenue by
  -- an earlier version of this script, then reverted back by
  -- payments_net_service_fee_rename.sql ("net revenue" read as the
  -- platform's total take, which is actually final_revenue — this column is
  -- only the net service fee). Nothing renames it here anymore.

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'pro_payout_amount'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN pro_payout_amount TO actual_payout_amount;
  END IF;
END $$;

-- ── 2. Platform-calculation snapshot columns ────────────────────────────────
-- Set once by create-payment-intent at checkout time (Step 1) and never
-- overwritten afterwards — historical payments must not change retroactively
-- even if platform_settings changes later.

-- platform_gross_revenue was dropped by payments_commission_revenue_rename.sql
-- — it was always identical to service_fee_amount (both are just the client
-- service fee before Stripe's cut), so it never carried independent
-- information. final_revenue/refund_commission are added directly here for
-- fresh installs; see that script's header for what they mean.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS base_amount              numeric(10, 2),
  ADD COLUMN IF NOT EXISTS estimated_payout_amount   numeric(10, 2),
  ADD COLUMN IF NOT EXISTS final_revenue             numeric(10, 2),
  ADD COLUMN IF NOT EXISTS refund_commission         numeric(10, 2),
  ADD COLUMN IF NOT EXISTS payment_version           integer NOT NULL DEFAULT 1;

-- ── 3. Raw Stripe ledger columns ────────────────────────────────────────────
-- Populated by the stripe-webhook function's reconciliation step (Step 2).
-- Every fee column is nullable and defaults to NULL — a fee category is only
-- ever written when Stripe actually returns it, never estimated.

-- stripe_payment_method (raw pm_ id) and stripe_available_on/
-- stripe_fee_details_json were dropped in payments_drop_unused_columns.sql
-- (nothing in the app read them — see that file's header). The fee-category
-- buckets (application/cross-border/currency-conversion/network/tax fee) and
-- the separate stripe_total_fee were collapsed into a single
-- stripe_processing_fee (the exact Balance Transaction `fee`, unbucketed) by
-- payments_simplify_stripe_fees.sql. stripe_card_funding, stripe_receipt_url,
-- stripe_settlement_currency and stripe_exchange_rate were dropped in
-- payments_drop_settlement_columns.sql (also unread). None of these are
-- re-added here so re-running this script can't resurrect them.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_type    text,
  ADD COLUMN IF NOT EXISTS stripe_card_brand              text,
  ADD COLUMN IF NOT EXISTS stripe_card_country             text,
  -- Exact Balance Transaction `fee`/`net`, in dollars — never bucketed, never estimated.
  ADD COLUMN IF NOT EXISTS stripe_processing_fee          numeric(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_net_amount              numeric(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_fee_verified            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciliation_last_error      text;

-- ── 4. Payout / escrow columns ───────────────────────────────────────────────
-- payout_status is deliberately narrow: NULL means "not yet released or
-- attempted" (readiness is a computed condition, see payments_ready_for_payout
-- below, not a stored state that would need a cron to flip). 'released' and
-- 'failed' are the only terminal states a real transfer attempt can leave.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payout_status         text
    CHECK (payout_status IN ('released', 'failed')),
  ADD COLUMN IF NOT EXISTS stripe_transfer_id     text,
  ADD COLUMN IF NOT EXISTS payout_released_at     timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_failure_message text,
  ADD COLUMN IF NOT EXISTS payout_idempotency_key uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS payments_stripe_fee_verified_idx ON public.payments(stripe_fee_verified);
CREATE INDEX IF NOT EXISTS payments_payout_status_idx       ON public.payments(payout_status);

-- ── 5. Shared "readiness" views ──────────────────────────────────────────────
-- One definition of "awaiting reconciliation" / "ready for payout" shared by
-- the admin dashboard and the edge functions, so they can never disagree.

CREATE OR REPLACE VIEW public.payments_awaiting_reconciliation
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status = 'succeeded'
  AND stripe_fee_verified = false;

CREATE OR REPLACE VIEW public.payments_ready_for_payout
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status = 'succeeded'
  AND stripe_fee_verified = true
  AND payout_status IS NULL
  AND refunded_amount = 0
  AND payout_hold_days_used IS NOT NULL
  AND now() >= created_at + (payout_hold_days_used || ' days')::interval;

-- security_invoker = true (Postgres 15+, what Supabase runs) makes these
-- views enforce the querying user's own RLS policies on public.payments
-- instead of the view owner's — required so "Clients/Providers can view own
-- payments" and "Admins can view all payments" keep applying through the view.
