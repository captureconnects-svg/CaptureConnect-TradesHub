// Pure financial math shared by create-payment-intent and stripe-webhook.
// No Stripe/Supabase calls in here — every function is a deterministic
// function of numbers already known, so results are reproducible and testable
// in isolation. Mirrored on the frontend at src/lib/payments/calculate.ts for
// checkout-page display (same duplication pattern already used for
// platformSettings.ts between Edge Functions and the frontend).

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The service/booking price before any fees — what the pro is nominally owed before commission. */
export function calculateBaseAmount(bookingOrOrderAmount: number): number {
  return round2(bookingOrOrderAmount);
}

/** Platform service fee charged to the client on top of the base amount. */
export function calculateClientServiceFee(baseAmount: number, clientFeePercent: number): number {
  return round2(baseAmount * (clientFeePercent / 100));
}

/** What the client is actually charged: base amount + client service fee. */
export function calculateCheckoutTotal(baseAmount: number, clientFeePercent: number): number {
  return round2(baseAmount + calculateClientServiceFee(baseAmount, clientFeePercent));
}

/** Platform commission taken out of the base amount (not the client's fee). */
export function calculateCommission(baseAmount: number, commissionPercent: number): number {
  return round2(baseAmount * (commissionPercent / 100));
}

/**
 * What the pro is owed: base amount minus platform commission. Deliberately
 * insulated from Stripe's processing fee — the platform's own margin absorbs
 * any shortfall, never the pro's payout. This is why "estimated" (computed at
 * checkout, before Stripe settles) and "actual" (computed post-reconciliation)
 * payout are mathematically identical in this system; "actual" exists as a
 * separate, immutable snapshot for audit purposes, not because the formula changes.
 */
export function calculateEstimatedPayout(baseAmount: number, commissionPercent: number): number {
  return round2(baseAmount - calculateCommission(baseAmount, commissionPercent));
}

/**
 * Platform's net revenue after Stripe's cut. Always gross revenue minus
 * Stripe's exact total fee — never an estimate. Returns null if the exact
 * Stripe fee isn't known yet (pre-reconciliation).
 */
export function calculateNetRevenue(grossRevenue: number, stripeTotalFee: number | null): number | null {
  if (stripeTotalFee == null) return null;
  return round2(grossRevenue - stripeTotalFee);
}

/**
 * Proportional refund amount for a partial refund of the original charge.
 * refundedGross is the amount actually refunded to the client (from Stripe,
 * in dollars). Returns the portion of the original client service fee and
 * base amount that refund represents, for reporting purposes.
 */
export function calculateRefundAmount(
  refundedGross: number,
  originalTotal: number,
  originalBaseAmount: number,
): { refundedBaseAmount: number; refundedServiceFee: number } {
  if (originalTotal <= 0) {
    return { refundedBaseAmount: 0, refundedServiceFee: 0 };
  }
  const proportion = Math.min(refundedGross / originalTotal, 1);
  const refundedBaseAmount = round2(originalBaseAmount * proportion);
  const refundedServiceFee = round2(refundedGross - refundedBaseAmount);
  return { refundedBaseAmount, refundedServiceFee };
}
