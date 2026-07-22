-- ============================================================
-- Adds admin-recorded transfer fee tracking to public.payments.
--
-- transfer_fees: the fee the admin was actually charged by the transfer
-- provider (Western Union, wire, etc.) when sending a pro's payout,
-- entered manually after payout_status = 'released' since it isn't known
-- at release time. net_final_revenue is stamped alongside it by the
-- set-transfer-fee Edge Function as final_revenue - transfer_fees, so
-- reports can sum the platform's true take after transfer costs without
-- recomputing it ad hoc.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transfer_fees     numeric(10, 2),
  ADD COLUMN IF NOT EXISTS net_final_revenue numeric(10, 2);
