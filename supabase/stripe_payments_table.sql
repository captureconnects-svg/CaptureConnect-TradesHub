-- ============================================================
-- Stripe payment integration – tables, columns, RLS, triggers
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ── 1. Reference columns on client_bookings ──────────────────────────────────
-- payment_status + refunded already exist (see client_bookings_payment_status.sql).
-- Add the Stripe object ids so a booking can be looked up from a Stripe event
-- and so the client/pro can see which charge paid for it.

ALTER TABLE public.client_bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text;

CREATE INDEX IF NOT EXISTS client_bookings_stripe_pi_idx
  ON public.client_bookings(stripe_payment_intent_id);

-- ── 2. Reference columns on client_shopping (merchandise orders) ────────────
-- Orders never had a payment_status column — shopping checkout currently
-- creates the order as "reserved" with no payment step. Add the same columns
-- as bookings so create-payment-intent / the webhook can treat orders the
-- same way once the shopping checkout is wired up to Stripe.

-- total_price only ever stores the base order amount (items + shipping) —
-- the platform service fee is calculated server-side in create-payment-intent
-- at charge time and is not known until Stripe actually collects it. Store it
-- separately once paid rather than folding it into total_price, so past
-- orders can show the fee that was actually charged, not a live recomputation
-- against whatever the platform's fee percent happens to be today.

ALTER TABLE public.client_shopping
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refunded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text,
  ADD COLUMN IF NOT EXISTS service_fee numeric(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS client_shopping_stripe_pi_idx
  ON public.client_shopping(stripe_payment_intent_id);

-- ── 3. payments ledger ────────────────────────────────────────────────────────
-- One row per PaymentIntent. This is the source of truth for what Stripe
-- actually charged/refunded; the booking/order columns above are a
-- convenience mirror for quick lookups from the UI.

CREATE TABLE IF NOT EXISTS public.payments (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              uuid        REFERENCES public.client_bookings(id) ON DELETE SET NULL,
  order_id                bigint      REFERENCES public.client_shopping(id) ON DELETE SET NULL,
  client_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id text       NOT NULL UNIQUE,
  stripe_charge_id        text,
  amount                  numeric(10, 2) NOT NULL,
  currency                text        NOT NULL DEFAULT 'usd',
  status                  text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  failure_message         text,
  refunded_amount         numeric(10, 2) NOT NULL DEFAULT 0,
  refunded_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_target_check CHECK (booking_id IS NOT NULL OR order_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS payments_client_id_idx   ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS payments_provider_id_idx ON public.payments(provider_id);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx  ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx    ON public.payments(order_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own payments"   ON public.payments;
DROP POLICY IF EXISTS "Providers can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments"     ON public.payments;

-- Reads only. All writes happen via the create-payment-intent / stripe-webhook
-- Edge Functions using the service role key, which bypasses RLS entirely —
-- no INSERT/UPDATE policy is granted to the authenticated role on purpose.
CREATE POLICY "Clients can view own payments"
ON public.payments FOR SELECT TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Providers can view own payments"
ON public.payments FOR SELECT TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT TO authenticated
USING (public.is_admin());

-- ── 4. stripe_webhook_events – idempotency ledger ────────────────────────────
-- Stripe retries webhook deliveries on timeout/5xx. Recording the event id
-- before processing lets the webhook short-circuit duplicate deliveries.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id           text        PRIMARY KEY,   -- Stripe event id, e.g. evt_...
  type         text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (webhook function) ever touches this table.

-- ── 5. Tamper protection ──────────────────────────────────────────────────────
-- Clients can update their own booking/order rows (cancel, etc.) via existing
-- RLS policies that are not column-scoped — without this trigger a client
-- could call `.update({ payment_status: 'paid' })` directly from the browser
-- and skip payment entirely. Block that specifically for the *client* side
-- of the row. The assigned pro keeps the ability to change these columns
-- (pro-dashboard already has a "mark as paid" action for cash/offline
-- payments — see handleMarkPaid in src/routes/pro-dashboard.tsx), and so do
-- the service role (Edge Functions) and admins.

CREATE OR REPLACE FUNCTION public.prevent_payment_field_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT public.is_admin()
     AND auth.uid() IS DISTINCT FROM OLD.tradesperson_id THEN
    IF (NEW.payment_status IS DISTINCT FROM OLD.payment_status)
       OR (NEW.refunded IS DISTINCT FROM OLD.refunded)
       OR (NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id)
       OR (NEW.stripe_charge_id IS DISTINCT FROM OLD.stripe_charge_id) THEN
      RAISE EXCEPTION 'payment_status, refunded and Stripe reference columns can only be changed by the assigned pro, the payment system, or an admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_bookings_payment_tamper_guard ON public.client_bookings;
CREATE TRIGGER client_bookings_payment_tamper_guard
  BEFORE UPDATE ON public.client_bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_field_tamper();

DROP TRIGGER IF EXISTS client_shopping_payment_tamper_guard ON public.client_shopping;
CREATE TRIGGER client_shopping_payment_tamper_guard
  BEFORE UPDATE ON public.client_shopping
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_field_tamper();
