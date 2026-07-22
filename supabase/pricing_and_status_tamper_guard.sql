-- Security fix (audit 2026-07-20): total_price/package_price/base_price on
-- client_bookings and total_price/sub_total/shipping_total on
-- client_shopping were client-writable at any time (RLS only protected
-- payment_status/refunded/Stripe id columns), letting a client tamper their
-- own order/booking price down to near-zero before triggering payment. The
-- create-payment-intent Edge Function now recomputes and self-heals these
-- columns server-side (service_role), so this trigger locks them from being
-- written by anyone else — client or pro.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).

CREATE OR REPLACE FUNCTION public.prevent_payment_field_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin() THEN
    IF (NEW.total_price IS DISTINCT FROM OLD.total_price)
       OR (TG_TABLE_NAME = 'client_bookings' AND (
             (NEW.package_price IS DISTINCT FROM OLD.package_price)
             OR (NEW.base_price IS DISTINCT FROM OLD.base_price)
           ))
       OR (TG_TABLE_NAME = 'client_shopping' AND (
             (NEW.sub_total IS DISTINCT FROM OLD.sub_total)
             OR (NEW.shipping_total IS DISTINCT FROM OLD.shipping_total)
           )) THEN
      RAISE EXCEPTION 'Price fields cannot be modified after creation.';
    END IF;

    IF auth.uid() IS DISTINCT FROM OLD.tradesperson_id THEN
      IF (NEW.payment_status IS DISTINCT FROM OLD.payment_status)
         OR (NEW.refunded IS DISTINCT FROM OLD.refunded)
         OR (NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id)
         OR (NEW.stripe_charge_id IS DISTINCT FROM OLD.stripe_charge_id) THEN
        RAISE EXCEPTION 'payment_status, refunded and Stripe reference columns can only be changed by the assigned pro, the payment system, or an admin';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Security fix (audit 2026-07-20): client_bookings_write_policies.sql lets
-- either party update their own booking row with no column restriction on
-- booking_status, so a client could set booking_status = 'confirmed' (or
-- 'completed') on their own pending booking without the pro ever accepting
-- it — create-payment-intent only checks booking_status = 'confirmed', so
-- this let a client unlock payment/checkout for an unconfirmed booking.
-- Only the assigned pro (or an admin/service_role) may move a booking to
-- 'confirmed' or 'completed'; both parties may still cancel.
CREATE OR REPLACE FUNCTION public.enforce_booking_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status
     AND NEW.booking_status IN ('confirmed', 'completed')
     AND auth.uid() IS DISTINCT FROM OLD.tradesperson_id THEN
    RAISE EXCEPTION 'Only the assigned pro can confirm or complete a booking.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_bookings_status_transition_guard ON public.client_bookings;
CREATE TRIGGER client_bookings_status_transition_guard
  BEFORE UPDATE ON public.client_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_status_transition();
