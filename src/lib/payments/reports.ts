import { supabase } from "@/lib/supabase";
import type { Payment } from "./types";

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  grossRevenue: number;
  netRevenue: number;
  paymentCount: number;
}

export interface FinancialReport {
  range: { from: string; to: string };
  daily: DailyRevenuePoint[];
  /** Sum of service_fee_amount — the client-facing service fee before Stripe's cut. */
  platformGrossRevenue: number;
  /** Sum of platform_net_service_fee — the service fee alone, after Stripe's cut. Excludes commission. */
  platformNetRevenue: number;
  /** Sum of platform_commission_amount minus refund_commission — the pro-side commission actually retained, net of commission forfeited on full refunds. Excludes the service fee entirely. */
  platformCommissionTotal: number;
  /** Sum of final_revenue: commission + net service fee, refund-aware — the platform's true total take. */
  platformFinalRevenue: number;
  /** Sum of transfer_fees — what the admin was actually charged sending pro payouts. */
  transferFeesPaid: number;
  /** Sum of net_final_revenue (falling back to final_revenue where no transfer fee has been recorded yet) — the platform's take after transfer costs. */
  netFinalRevenueTotal: number;
  stripeFeesPaid: number;
  proPayoutsReleased: number;
  pendingPayoutsTotal: number;
  refundTotals: number;
  refundCommissionForfeited: number;
  netPlatformIncome: number;
  /** Total number of succeeded/partially_refunded/refunded payments in range — sum of daily.paymentCount. */
  totalPaymentCount: number;
}

export interface ProFinancialRow {
  proId: string;
  name: string;
  email: string | null;
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  pendingPayouts: number;
  totalRefunds: number;
}

const sum = (values: (number | null)[]): number =>
  Math.round(values.reduce<number>((total, v) => total + (v ?? 0), 0) * 100) / 100;

/**
 * Every number here comes from the locally stored payments ledger — never a
 * live Stripe call, per the "no report should query Stripe live" requirement.
 */
export async function fetchFinancialReport(from: Date, to: Date): Promise<FinancialReport> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (error) throw new Error(error.message);
  const payments = (data ?? []) as Payment[];

  // "refunded" (full refund) is included alongside "succeeded"/"partially_refunded":
  // the service fee is never returned to the client (see issue-refund), so a
  // fully refunded payment still leaves the platform with real, retained
  // revenue — its final_revenue already excludes the forfeited commission
  // (see stripe-webhook's handleChargeRefunded), so it isn't double-counted.
  const succeeded = payments.filter(
    (p) => p.status === "succeeded" || p.status === "partially_refunded" || p.status === "refunded",
  );

  const byDay = new Map<string, { gross: number; net: number; count: number }>();
  for (const p of succeeded) {
    const day = p.created_at.slice(0, 10);
    const entry = byDay.get(day) ?? { gross: 0, net: 0, count: 0 };
    entry.gross += p.service_fee_amount ?? 0;
    entry.net += p.platform_net_service_fee ?? 0;
    entry.count += 1;
    byDay.set(day, entry);
  }
  const daily = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      grossRevenue: Math.round(v.gross * 100) / 100,
      netRevenue: Math.round(v.net * 100) / 100,
      paymentCount: v.count,
    }));

  const releasedPayouts = payments.filter((p) => p.payout_status === "released");
  // A partial refund still owes the pro whatever's left (actual_payout_amount
  // is reduced, not zeroed — see stripe-webhook's handleChargeRefunded), so it
  // stays counted as pending/escrow. Only a full refund (status "refunded",
  // actual_payout_amount 0) drops out — mirrors payments_ready_for_payout.
  const pendingPayouts = succeeded.filter(
    (p) => p.stripe_fee_verified && p.payout_status === null && p.status !== "refunded",
  );

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    daily,
    platformGrossRevenue: sum(succeeded.map((p) => p.service_fee_amount)),
    platformNetRevenue: sum(succeeded.map((p) => p.platform_net_service_fee)),
    // platform_commission_amount is an immutable checkout-time snapshot that
    // never accounts for refunds (see stripe-webhook's handleChargeRefunded),
    // so a full refund's forfeited commission must be subtracted here to get
    // the commission actually retained.
    platformCommissionTotal:
      sum(succeeded.map((p) => p.platform_commission_amount)) -
      sum(succeeded.map((p) => p.refund_commission)),
    // final_revenue already accounts for commission forfeited on a full
    // refund (see stripe-webhook's handleChargeRefunded), so this is the
    // platform's true take without double-subtracting refunds that were
    // never platform revenue in the first place (refunds only ever return
    // the pro's base amount, never the service fee).
    platformFinalRevenue: sum(succeeded.map((p) => p.final_revenue)),
    transferFeesPaid: sum(succeeded.map((p) => p.transfer_fees)),
    // net_final_revenue is only stamped once an admin records a transfer fee
    // for that payment (see set-transfer-fee) — until then, final_revenue is
    // the best-known take for that row, so it isn't dropped from the total.
    netFinalRevenueTotal: sum(succeeded.map((p) => p.net_final_revenue ?? p.final_revenue)),
    stripeFeesPaid: sum(succeeded.map((p) => p.stripe_processing_fee)),
    proPayoutsReleased: sum(releasedPayouts.map((p) => p.actual_payout_amount)),
    // actual_payout_amount, not estimated_payout_amount, so a partial
    // refund's reduced payout is reflected here instead of the pre-refund estimate.
    pendingPayoutsTotal: sum(pendingPayouts.map((p) => p.actual_payout_amount ?? p.estimated_payout_amount)),
    refundTotals: sum(payments.map((p) => p.refunded_amount)),
    refundCommissionForfeited: sum(payments.map((p) => p.refund_commission)),
    netPlatformIncome: sum(succeeded.map((p) => p.final_revenue)),
    totalPaymentCount: succeeded.length,
  };
}

/**
 * Per-pro breakdown for the same range/ledger source as fetchFinancialReport —
 * one row per tradesperson who has at least one payment in range.
 */
export async function fetchProFinancialReport(from: Date, to: Date): Promise<ProFinancialRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (error) throw new Error(error.message);
  const payments = (data ?? []) as Payment[];
  if (payments.length === 0) return [];

  const byPro = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = byPro.get(p.provider_id) ?? [];
    list.push(p);
    byPro.set(p.provider_id, list);
  }

  const proIds = [...byPro.keys()];
  const { data: profiles, error: profilesError } = await supabase
    .from("tradesperson_profiles")
    .select("id, full_name, username, email")
    .in("id", proIds);
  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map<string, { name: string; email: string | null }>();
  for (const pr of profiles ?? []) {
    profileMap.set(pr.id as string, {
      name: String((pr as any).full_name ?? (pr as any).username ?? "Unknown"),
      email: ((pr as any).email as string) ?? null,
    });
  }

  const rows = proIds.map((proId): ProFinancialRow => {
    const proPayments = byPro.get(proId)!;
    const succeeded = proPayments.filter(
      (p) => p.status === "succeeded" || p.status === "partially_refunded" || p.status === "refunded",
    );
    const releasedPayouts = proPayments.filter((p) => p.payout_status === "released");
    // Same partial-refund-stays-pending rule as fetchFinancialReport above.
    const pendingPayouts = succeeded.filter(
      (p) => p.stripe_fee_verified && p.payout_status === null && p.status !== "refunded",
    );

    return {
      proId,
      name: profileMap.get(proId)?.name ?? "Unknown",
      email: profileMap.get(proId)?.email ?? null,
      totalBookings: proPayments.length,
      totalRevenue: sum(succeeded.map((p) => p.amount)),
      totalCommission:
        sum(succeeded.map((p) => p.platform_commission_amount)) -
        sum(succeeded.map((p) => p.refund_commission)),
      totalPayouts: sum(releasedPayouts.map((p) => p.actual_payout_amount)),
      pendingPayouts: sum(pendingPayouts.map((p) => p.actual_payout_amount ?? p.estimated_payout_amount)),
      totalRefunds: sum(proPayments.map((p) => p.refunded_amount)),
    };
  });

  return rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
}
