import { supabase } from "@/lib/supabase";
import { invokePaymentsFunction } from "./invokeFunction";
import type { Payment } from "./types";

/** Succeeded payments whose exact Stripe fees haven't been reconciled yet — mirrors public.payments_awaiting_reconciliation. */
export async function fetchUnverifiedPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments_awaiting_reconciliation")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

/** Admin-only: retries fee reconciliation for every unverified payment (batched server-side). */
export async function retryReconciliation(): Promise<{ checked: number; reconciled: number; stillFailing: number }> {
  return invokePaymentsFunction("reconcile-pending-payments");
}
