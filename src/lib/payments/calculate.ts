/**
 * Display-only financial math for checkout pages and admin/pro dashboards.
 * Mirrors supabase/functions/_shared/paymentCalculations.ts — the Stripe
 * charge itself is always computed server-side in create-payment-intent;
 * this exists so the UI can show the same numbers before/independent of
 * that round-trip. Never used to decide what Stripe actually charges.
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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

/** What the pro is owed: base amount minus platform commission. */
export function calculateEstimatedPayout(baseAmount: number, commissionPercent: number): number {
  return round2(baseAmount - calculateCommission(baseAmount, commissionPercent));
}

/** Platform's net revenue after Stripe's exact cut. Null until Stripe's fee is known — never estimated. */
export function calculateNetRevenue(grossRevenue: number, stripeTotalFee: number | null): number | null {
  if (stripeTotalFee == null) return null;
  return round2(grossRevenue - stripeTotalFee);
}
