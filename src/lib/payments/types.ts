/** Mirrors the public.payments columns added by supabase/payments_financial_ledger.sql. */
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
export type PayoutStatus = "released" | "failed" | null;

export interface Payment {
  id: string;
  booking_id: string | null;
  order_id: number | null;
  client_id: string;
  provider_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failure_message: string | null;
  refunded_amount: number;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;

  // Platform calculation snapshot — set once at checkout, immutable.
  base_amount: number | null;
  service_fee_amount: number | null;
  platform_commission_amount: number | null;
  estimated_payout_amount: number | null;
  client_fee_percent_used: number | null;
  payout_hold_days_used: number | null;
  platform_settings_version: number | null;
  payment_version: number;

  // Raw Stripe ledger — populated by reconciliation. processing_fee/net_amount
  // are Stripe's own Balance Transaction fee/net totals, taken verbatim —
  // never bucketed or estimated.
  stripe_balance_transaction_id: string | null;
  stripe_payment_method_type: string | null;
  stripe_card_brand: string | null;
  stripe_card_country: string | null;
  stripe_processing_fee: number | null;
  stripe_net_amount: number | null;
  stripe_fee_verified: boolean;
  reconciliation_attempts: number;
  reconciliation_last_error: string | null;

  platform_net_service_fee: number | null;
  /** platform_commission_amount + platform_net_service_fee — the platform's true total take from this payment. Excludes forfeited commission on a refund (see refund_commission). */
  final_revenue: number | null;
  /** 0 once a full refund lands — the pro receives nothing for a refunded transaction. */
  actual_payout_amount: number | null;
  /** Set on a full refund: the commission the platform forfeited (didn't collect) because only the base amount is refunded and the pro is paid $0. */
  refund_commission: number | null;

  // Payout / escrow.
  /** Null until the booking/order is marked completed AND the payment has succeeded — see supabase/payments_escrow_start.sql. Anchors the payout_hold_days_used countdown; before this is set, funds are "in the marketplace," not escrow. */
  escrow_started_at: string | null;
  payout_status: PayoutStatus;
  stripe_transfer_id: string | null;
  payout_released_at: string | null;
  payout_released_by: string | null;
  payout_failure_message: string | null;

  /** Fee the admin was actually charged sending this payout's transfer — entered manually after release, never estimated. */
  transfer_fees: number | null;
  /** final_revenue - transfer_fees, stamped alongside transfer_fees by set-transfer-fee. Null until a fee has been recorded. */
  net_final_revenue: number | null;
}

/**
 * Mirrors public.payout_receipts — one payout event, covering one or more
 * bookings, confirmed manually by an admin (supabase/payout_receipts_table.sql,
 * supabase/payout_receipts_extend.sql). This full shape includes admin-only
 * fields (admin_receipt_records, admin_notes) — only use it in admin-context
 * code. Pro-facing code must use ProPayoutReceipt instead.
 */
export interface PayoutReceipt {
  id: string;
  tradesperson_id: string;
  uploaded_by: string | null;
  amount: number;
  currency: string;
  status: string;
  receipt_number: string | null;
  payout_number: string | null;
  transfer_method: string | null;
  transfer_reference: string | null;
  transfer_date: string | null;
  expected_delivery: string | null;
  /** Admin-only. Never exposed to the pro. */
  admin_notes: string | null;
  /** Path within the private payout_receipts bucket — the TradeHub-generated PDF once is_generated_receipt is true. */
  file_path: string;
  /** Path within the admin-only payout_admin_receipts bucket. Admin-only. */
  admin_receipt_records: string | null;
  /** false = a legacy row predating the generated-receipt system — hidden from the pro. */
  is_generated_receipt: boolean;
  /** The public.payments rows this payout covered, snapshotted at confirm time. */
  payment_ids: string[];
  created_at: string;
}

/**
 * Mirrors public.payout_receipts_pro — the column-restricted, security_invoker
 * view a pro is allowed to query. Deliberately excludes uploaded_by,
 * admin_receipt_records and admin_notes at the type level, matching the
 * exclusion enforced by the view itself.
 */
export interface ProPayoutReceipt {
  id: string;
  tradesperson_id: string;
  amount: number;
  currency: string;
  status: string;
  receipt_number: string | null;
  payout_number: string | null;
  transfer_method: string | null;
  transfer_reference: string | null;
  transfer_date: string | null;
  expected_delivery: string | null;
  file_path: string;
  payment_ids: string[];
  created_at: string;
}

export type PayoutLabelTone = "released" | "failed" | "ineligible" | "marketplace" | "escrow";

/**
 * The payout-state label shown next to a payment in the admin and pro
 * dashboards. "Marketplace" = paid but the booking/order isn't completed
 * yet, so escrow hasn't started; "Escrow" = completed and holding (whether
 * or not the hold period has elapsed — payments_ready_for_payout is what
 * actually gates release, this is just a display label).
 */
export function getPayoutLabel(payment: Pick<Payment, "status" | "payout_status" | "escrow_started_at">): {
  text: string;
  tone: PayoutLabelTone;
} {
  if (payment.payout_status === "released") return { text: "Released", tone: "released" };
  if (payment.payout_status === "failed") return { text: "Failed", tone: "failed" };
  if (payment.status === "pending" || payment.status === "refunded") return { text: "Not eligible", tone: "ineligible" };
  if (!payment.escrow_started_at) return { text: "Marketplace", tone: "marketplace" };
  return { text: "Escrow", tone: "escrow" };
}

export interface TradespersonStripeAccount {
  id: string;
  stripe_connect_account_id: string | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}
