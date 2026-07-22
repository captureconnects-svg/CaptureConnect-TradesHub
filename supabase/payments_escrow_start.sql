-- ============================================================
-- Escrow now starts when the booking/order is COMPLETED, not the moment
-- the client's payment succeeds. Previously the 3-day hold clock
-- (payout_hold_days_used) was anchored to payments.created_at, meaning a
-- payout could become releasable before the job was ever finished.
--
-- escrow_started_at is a denormalized anchor stamped onto the payments row
-- once BOTH conditions are true: the payment has succeeded (or
-- partially_refunded) AND the booking/order has been marked completed
-- (client_bookings.completed_at) / delivered (client_shopping.delivered_at
-- — that column already exists). It's set by whichever of "payment
-- succeeds" / "job completed" happens second — the completion side is
-- handled by the triggers below (payments has no client-writable RLS
-- policy), the payment-succeeds side by stripe-webhook's own service-role
-- write in handlePaymentSucceeded.
--
-- Until escrow_started_at is set, a payment can never appear in
-- payments_ready_for_payout, no matter how old it is — an incomplete
-- job's funds are never "in escrow."
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS escrow_started_at timestamptz;

ALTER TABLE public.client_bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Redefine payments_ready_for_payout to anchor the hold period on
-- escrow_started_at instead of created_at. Everything else (statuses
-- accepted, fee verification, payout_status, payout_hold_days_used
-- presence) is unchanged from payments_ready_for_payout_allow_partial_refunds.sql.
DROP VIEW IF EXISTS public.payments_ready_for_payout;

CREATE OR REPLACE VIEW public.payments_ready_for_payout
WITH (security_invoker = true) AS
SELECT *
FROM public.payments
WHERE status IN ('succeeded', 'partially_refunded')
  AND stripe_fee_verified = true
  AND payout_status IS NULL
  AND payout_hold_days_used IS NOT NULL
  AND escrow_started_at IS NOT NULL
  AND now() >= escrow_started_at + (payout_hold_days_used || ' days')::interval;

GRANT SELECT ON public.payments_ready_for_payout TO service_role, authenticated;

-- ── Triggers: cascade completion into escrow_started_at ────────────────────
-- The browser client only has SELECT on `payments` (it's a financial ledger,
-- RLS-locked — see stripe_payments_table.sql), so a pro's own booking/order
-- completion action can't set escrow_started_at directly from the frontend.
-- These SECURITY DEFINER triggers do it server-side instead, and are the
-- sole place (besides the stripe-webhook's own service-role write for the
-- reverse ordering) that ever sets escrow_started_at.

-- 1) client_bookings: stamp completed_at the moment booking_status first
-- becomes 'completed'.
CREATE OR REPLACE FUNCTION public.stamp_booking_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status = 'completed' AND (OLD.booking_status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_booking_completed_at ON public.client_bookings;
CREATE TRIGGER trg_stamp_booking_completed_at
  BEFORE UPDATE ON public.client_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_booking_completed_at();

-- 2) client_bookings: once completed, start escrow on the matching payment
-- if it has already succeeded (if not paid yet, the webhook's own
-- service-role write covers the reverse ordering once it does).
CREATE OR REPLACE FUNCTION public.start_escrow_on_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status = 'completed' AND (OLD.booking_status IS DISTINCT FROM 'completed') THEN
    UPDATE public.payments
    SET escrow_started_at = now()
    WHERE booking_id = NEW.id
      AND status IN ('succeeded', 'partially_refunded')
      AND escrow_started_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_start_escrow_on_booking_completed ON public.client_bookings;
CREATE TRIGGER trg_start_escrow_on_booking_completed
  AFTER UPDATE ON public.client_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.start_escrow_on_booking_completed();

-- 3) client_shopping: once delivered/picked up, start escrow the same way.
-- delivered_at is already stamped by updateOrderFulfillment's own update
-- call (that table's RLS already lets the pro write it) — this trigger only
-- needs to cascade into payments.
CREATE OR REPLACE FUNCTION public.start_escrow_on_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW."isDelivered" IS TRUE AND (OLD."isDelivered" IS DISTINCT FROM TRUE) THEN
    UPDATE public.payments
    SET escrow_started_at = now()
    WHERE order_id = NEW.id
      AND status IN ('succeeded', 'partially_refunded')
      AND escrow_started_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_start_escrow_on_order_delivered ON public.client_shopping;
CREATE TRIGGER trg_start_escrow_on_order_delivered
  AFTER UPDATE ON public.client_shopping
  FOR EACH ROW
  EXECUTE FUNCTION public.start_escrow_on_order_delivered();

-- Verify.
SELECT status, payout_status, escrow_started_at, payout_hold_days_used
FROM public.payments_ready_for_payout
ORDER BY escrow_started_at DESC
LIMIT 20;
