import { supabase } from "@/lib/supabase";
import { invokePaymentsFunction } from "./invokeFunction";
import type { Payment } from "./types";

/** Payments past their escrow hold period, fee-verified, unreleased, unrefunded — mirrors public.payments_ready_for_payout. */
export async function fetchReadyPayouts(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments_ready_for_payout")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

/** Admin-only: releases a single payment's payout via Stripe Connect transfer. Throws with the server's error message on failure (e.g. pro not onboarded, still in hold period). */
export async function releasePayout(paymentId: string): Promise<{ transferId: string; status: string }> {
  return invokePaymentsFunction("release-payout", { paymentId });
}

/** Admin-only: marks all of a pro's escrow-hold-cleared payments as paid out manually (e.g. a bank wire) — no Stripe transfer. Throws with the server's error message if none are past their hold period yet. */
export async function releaseManualPayout(proId: string): Promise<{ count: number; total: number; paymentIds: string[] }> {
  return invokePaymentsFunction("mark-manual-payout", { proId });
}

/** Admin-only: records the fee charged for a released payout's transfer. Only allowed once payout_status is 'released' — throws with the server's error message otherwise. */
export async function setTransferFee(
  paymentId: string,
  transferFees: number,
): Promise<{ transferFees: number; netFinalRevenue: number }> {
  return invokePaymentsFunction("set-transfer-fee", { paymentId, transferFees });
}
