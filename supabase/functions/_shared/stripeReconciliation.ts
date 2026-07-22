// Walks PaymentIntent → latest Charge → Balance Transaction to pull the
// EXACT processing fee and net amount Stripe charged for a payment. This is
// the only place in the codebase allowed to determine what Stripe's cut
// was — nothing here is ever estimated. If a value isn't available, it comes
// back null and stays null in the database (never defaulted to 0).
import type { Stripe } from "./stripe.ts";
import { calculateNetRevenue } from "./paymentCalculations.ts";

export interface ReconciliationResult {
  chargeId: string;
  balanceTransactionId: string;
  paymentMethodType: string | null;
  cardBrand: string | null;
  cardCountry: string | null;
  /** Balance Transaction's `fee`, in dollars — Stripe's exact total cut, never estimated. */
  processingFee: number;
  /** Balance Transaction's `net`, in dollars — what actually settles after Stripe's fee. */
  netAmount: number;
}

/**
 * Extracts a readable message from whatever reconcilePayment() threw.
 * `err instanceof Error` alone isn't reliable here — the Stripe SDK's error
 * classes can fail that check in Deno (cross-realm/module-instance
 * identity), so a plain `String(err)` fallback silently produces the
 * useless literal "[object Object]" instead of the actual failure reason.
 * This checks for a `.message` string first (covers Error-shaped objects
 * that fail `instanceof`), then falls back to JSON before ever resorting to
 * `String()`.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function reconcilePayment(stripe: Stripe, paymentIntentId: string): Promise<ReconciliationResult> {
  // Reuse the existing Stripe client; one round trip expands PaymentIntent →
  // Charge → Balance Transaction instead of three separate retrieve calls.
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge.balance_transaction"],
  });

  const charge = pi.latest_charge as Stripe.Charge | null;
  if (!charge || typeof charge === "string") {
    throw new Error(`No settled charge found for PaymentIntent ${paymentIntentId}`);
  }

  const balanceTransaction = charge.balance_transaction as Stripe.BalanceTransaction | string | null;
  if (!balanceTransaction || typeof balanceTransaction === "string") {
    throw new Error(`No balance transaction found for charge ${charge.id}`);
  }

  const card = charge.payment_method_details?.card ?? null;

  return {
    chargeId: charge.id,
    balanceTransactionId: balanceTransaction.id,
    paymentMethodType: charge.payment_method_details?.type ?? null,
    cardBrand: card?.brand ?? null,
    cardCountry: card?.country ?? null,
    // Cents → dollars. fee/net are Stripe's own totals — not summed from
    // fee_details[], so there's no bucketing/categorization to get wrong.
    processingFee: balanceTransaction.fee / 100,
    netAmount: balanceTransaction.net / 100,
  };
}

/**
 * Shapes a successful reconciliation into a `payments` row update. Shared by
 * stripe-webhook (first attempt) and reconcile-pending-payments (retries) so
 * both write the exact same set of columns.
 *
 * final_revenue is the platform's true total take: its commission cut from
 * the pro's base amount plus its net service fee from the client after
 * Stripe's cut. If refundCommission is already set (a full refund already
 * ran before this reconciliation pass completed — see
 * stripe-webhook's handleChargeRefunded), that forfeited commission is
 * excluded rather than double counted.
 *
 * actual_payout_amount:
 *   - Full refund (refundCommission set): 0 — the pro receives nothing and
 *     the platform forfeits its commission rather than collect it anyway.
 *   - Partial refund (refundedAmount > 0 but no refundCommission): the
 *     platform still collects its FULL commission — only the pro's payout
 *     absorbs the refunded amount, floored at 0.
 *   - No refund: the original estimate, unchanged.
 * This runs whether reconciliation lands before or after a refund — using
 * refundedAmount (not just refundCommission) means a partial refund's payout
 * reduction survives even if reconciliation re-runs later.
 */
export function buildReconciliationUpdate(
  result: ReconciliationResult,
  known: {
    serviceFeeAmount: number | null;
    commissionAmount: number | null;
    refundCommission: number | null;
    refundedAmount: number | null;
    estimatedPayout: number | null;
  },
): Record<string, unknown> {
  const netRevenue = known.serviceFeeAmount != null ? calculateNetRevenue(known.serviceFeeAmount, result.processingFee) : null;
  const finalRevenue = netRevenue != null
    ? netRevenue + (known.commissionAmount ?? 0) - (known.refundCommission ?? 0)
    : null;

  const payoutAfterRefund = known.estimatedPayout != null
    ? Math.max(0, known.estimatedPayout - (known.refundedAmount ?? 0))
    : known.estimatedPayout;

  return {
    stripe_balance_transaction_id: result.balanceTransactionId,
    stripe_payment_method_type: result.paymentMethodType,
    stripe_card_brand: result.cardBrand,
    stripe_card_country: result.cardCountry,
    stripe_processing_fee: result.processingFee,
    stripe_net_amount: result.netAmount,
    stripe_fee_verified: true,
    platform_net_service_fee: netRevenue,
    final_revenue: finalRevenue,
    actual_payout_amount: known.refundCommission != null ? 0 : payoutAfterRefund,
    reconciliation_last_error: null,
  };
}
