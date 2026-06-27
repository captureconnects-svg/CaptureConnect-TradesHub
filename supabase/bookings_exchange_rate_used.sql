-- ── Booking: exchange_rate_used column ──────────────────────────────────────
-- Records the USD→JMD rate that was live at the moment a booking was paid.
-- This column must NEVER be updated after a booking reaches a paid/confirmed
-- state — historical amounts must remain as-charged in USD.
-- Safe to re-run.

ALTER TABLE public.client_bookings
  ADD COLUMN IF NOT EXISTS exchange_rate_used numeric;

COMMENT ON COLUMN public.client_bookings.exchange_rate_used IS
  'USD→JMD exchange rate at the time of payment. Immutable after payment is confirmed.';
