-- ============================================================
-- Backfills the calculation-snapshot fields on `payments` rows left NULL by
-- the create-payment-intent silent-insert-failure bug (now fixed). Rather
-- than stamping every broken row with today's settings — which would be
-- wrong for any payment made before the most recent settings change — this
-- reconstructs the fee %, commission %, and payout hold days that were
-- ACTUALLY in effect at each payment's created_at, by walking
-- platform_settings_history (one row per changed field, with changed_at)
-- backward to the most recent change before that moment. Falls back to the
-- original seeded defaults (6% / 14% / 3 days — see platform_settings_tables.sql)
-- when no history entry predates the payment, i.e. the setting had never
-- been changed yet at that point.
--
-- base_amount/service_fee_amount/platform_commission_amount/
-- estimated_payout_amount are then derived from the ACTUAL amount charged
-- (payments.amount, known precisely regardless of the bug) split by the
-- reconstructed fee %, using the same math as paymentCalculations.ts.
--
-- platform_settings_version is the one approximate field here — the history
-- table doesn't store version numbers, only timestamps, so it's inferred as
-- 1 + the count of distinct prior settings-save events. Everything else is
-- an exact reconstruction, not a guess.
--
-- For rows already reconciled (stripe_fee_verified = true), also backfills
-- platform_net_service_fee, final_revenue and actual_payout_amount, which
-- reconciliation tried to compute at the time but got NULL inputs from the
-- same bug. Rows already fully refunded (refund_commission is set) are
-- correctly excluded from commission in final_revenue and keep
-- actual_payout_amount at 0, mirroring handleChargeRefunded's logic.
--
-- Run the SELECT below FIRST to review what would change before running the
-- UPDATE. Run in Supabase SQL Editor. Run AFTER
-- payments_commission_revenue_rename.sql (this assumes the platform_commission_*
-- column names already exist).
-- ============================================================

-- ── Preview (read-only) ──────────────────────────────────────────────────
WITH reconstructed AS (
  SELECT
    p.id,
    p.amount,
    p.stripe_fee_verified,
    p.stripe_processing_fee,
    p.refund_commission,
    fee.fee_percent,
    comm.commission_percent,
    hold.hold_days,
    ver.approx_version,
    round(p.amount / (1 + fee.fee_percent / 100), 2) AS base_amount
  FROM public.payments p
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT h.new_value::numeric FROM public.platform_settings_history h
       WHERE h.setting_name = 'client_service_fee_percent' AND h.changed_at <= p.created_at
       ORDER BY h.changed_at DESC LIMIT 1),
      6
    ) AS fee_percent
  ) fee
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT h.new_value::numeric FROM public.platform_settings_history h
       WHERE h.setting_name = 'pro_commission_percent' AND h.changed_at <= p.created_at
       ORDER BY h.changed_at DESC LIMIT 1),
      14
    ) AS commission_percent
  ) comm
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT h.new_value::integer FROM public.platform_settings_history h
       WHERE h.setting_name = 'default_payout_hold_days' AND h.changed_at <= p.created_at
       ORDER BY h.changed_at DESC LIMIT 1),
      3
    ) AS hold_days
  ) hold
  CROSS JOIN LATERAL (
    SELECT 1 + COUNT(DISTINCT h.changed_at) AS approx_version
    FROM public.platform_settings_history h
    WHERE h.changed_at <= p.created_at
  ) ver
  WHERE p.base_amount IS NULL
)
SELECT
  id, amount, fee_percent, commission_percent, hold_days, approx_version,
  base_amount,
  amount - base_amount AS service_fee_amount,
  round(base_amount * commission_percent / 100, 2) AS platform_commission_amount,
  CASE WHEN refund_commission IS NOT NULL THEN 0
       ELSE base_amount - round(base_amount * commission_percent / 100, 2)
  END AS estimated_payout_amount,
  CASE WHEN stripe_fee_verified THEN (amount - base_amount) - stripe_processing_fee ELSE NULL END AS platform_net_service_fee,
  CASE WHEN stripe_fee_verified THEN
    ((amount - base_amount) - stripe_processing_fee)
      + round(base_amount * commission_percent / 100, 2)
      - COALESCE(refund_commission, 0)
  ELSE NULL END AS final_revenue
FROM reconstructed
ORDER BY id;

-- ── Apply (uncomment and run after reviewing the preview above) ─────────
-- WITH reconstructed AS (
--   SELECT
--     p.id,
--     p.amount,
--     p.stripe_fee_verified,
--     p.stripe_processing_fee,
--     p.refund_commission,
--     fee.fee_percent,
--     comm.commission_percent,
--     hold.hold_days,
--     ver.approx_version,
--     round(p.amount / (1 + fee.fee_percent / 100), 2) AS base_amount
--   FROM public.payments p
--   CROSS JOIN LATERAL (
--     SELECT COALESCE(
--       (SELECT h.new_value::numeric FROM public.platform_settings_history h
--        WHERE h.setting_name = 'client_service_fee_percent' AND h.changed_at <= p.created_at
--        ORDER BY h.changed_at DESC LIMIT 1),
--       6
--     ) AS fee_percent
--   ) fee
--   CROSS JOIN LATERAL (
--     SELECT COALESCE(
--       (SELECT h.new_value::numeric FROM public.platform_settings_history h
--        WHERE h.setting_name = 'pro_commission_percent' AND h.changed_at <= p.created_at
--        ORDER BY h.changed_at DESC LIMIT 1),
--       14
--     ) AS commission_percent
--   ) comm
--   CROSS JOIN LATERAL (
--     SELECT COALESCE(
--       (SELECT h.new_value::integer FROM public.platform_settings_history h
--        WHERE h.setting_name = 'default_payout_hold_days' AND h.changed_at <= p.created_at
--        ORDER BY h.changed_at DESC LIMIT 1),
--       3
--     ) AS hold_days
--   ) hold
--   CROSS JOIN LATERAL (
--     SELECT 1 + COUNT(DISTINCT h.changed_at) AS approx_version
--     FROM public.platform_settings_history h
--     WHERE h.changed_at <= p.created_at
--   ) ver
--   WHERE p.base_amount IS NULL
-- )
-- UPDATE public.payments p
-- SET
--   client_fee_percent_used = r.fee_percent,
--   payout_hold_days_used = r.hold_days,
--   platform_settings_version = r.approx_version,
--   base_amount = r.base_amount,
--   service_fee_amount = p.amount - r.base_amount,
--   platform_commission_amount = round(r.base_amount * r.commission_percent / 100, 2),
--   estimated_payout_amount = CASE WHEN r.refund_commission IS NOT NULL THEN 0
--     ELSE r.base_amount - round(r.base_amount * r.commission_percent / 100, 2)
--   END,
--   platform_net_service_fee = CASE WHEN r.stripe_fee_verified THEN (p.amount - r.base_amount) - r.stripe_processing_fee ELSE p.platform_net_service_fee END,
--   final_revenue = CASE WHEN r.stripe_fee_verified THEN
--     ((p.amount - r.base_amount) - r.stripe_processing_fee)
--       + round(r.base_amount * r.commission_percent / 100, 2)
--       - COALESCE(r.refund_commission, 0)
--   ELSE p.final_revenue END,
--   actual_payout_amount = CASE
--     WHEN r.refund_commission IS NOT NULL THEN 0
--     WHEN r.stripe_fee_verified THEN r.base_amount - round(r.base_amount * r.commission_percent / 100, 2)
--     ELSE p.actual_payout_amount
--   END
-- FROM reconstructed r
-- WHERE p.id = r.id;
