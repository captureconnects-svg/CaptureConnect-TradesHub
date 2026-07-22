import { supabase } from "@/lib/supabase";
import type { Payment, ProPayoutReceipt } from "./types";

export interface PaymentFilters {
  status?: Payment["status"];
  /** true = only unverified fee reconciliation, false = only verified. */
  feeVerified?: boolean;
  search?: string;
  limit?: number;
}

/** Admin payments ledger list — RLS ("Admins can view all payments") scopes this to admins only. */
export async function fetchPayments(filters: PaymentFilters = {}): Promise<Payment[]> {
  let query = supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.feeVerified !== undefined) query = query.eq("stripe_fee_verified", filters.feeVerified);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function fetchPaymentById(id: string): Promise<Payment | null> {
  const { data, error } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Payment) ?? null;
}

/** Admin-only: the specific payments a payout covered, for receipt line items. */
export async function fetchPaymentsByIds(ids: string[]): Promise<Payment[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("payments").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

/** A pro's own payments — RLS ("Providers can view own payments") scopes this to the caller. */
export async function fetchProPayments(providerId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export interface PayoutReceiptRecord extends ProPayoutReceipt {
  /** Signed URL (1 hour) into the private payout_receipts bucket — null if signing failed. */
  receiptUrl: string | null;
}

/**
 * A pro's own payout receipts — TradeHub-generated PDFs only. Queries the
 * payout_receipts_pro view (supabase/payout_receipts_extend.sql), which both
 * excludes admin-only columns (admin_receipt_records, admin_notes) and
 * filters out legacy rows with no generated PDF, so there's no way for a pro
 * to read admin-only data even via a raw client call. The view's
 * security_invoker still enforces "Pros can view own payout receipts" from
 * the base table, and the storage policy of the same name scopes signed-URL
 * creation.
 */
export async function fetchProPayoutReceipts(proId: string): Promise<PayoutReceiptRecord[]> {
  const { data, error } = await supabase
    .from("payout_receipts_pro")
    .select("*")
    .eq("tradesperson_id", proId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const receipts = (data ?? []) as ProPayoutReceipt[];
  if (receipts.length === 0) return [];

  return Promise.all(
    receipts.map(async (r) => {
      const { data: signed } = await supabase.storage
        .from("payout_receipts")
        .createSignedUrl(r.file_path, 60 * 60);
      return { ...r, receiptUrl: signed?.signedUrl ?? null };
    }),
  );
}

export interface ClientPaymentRecord extends Payment {
  proName: string;
  description: string;
}

/** A client's own payments — RLS ("Clients can view own payments") scopes this to the caller. */
export async function fetchClientPayments(clientId: string): Promise<ClientPaymentRecord[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const payments = (data ?? []) as Payment[];
  if (payments.length === 0) return [];

  const bookingIds = [...new Set(payments.filter((p) => p.booking_id).map((p) => p.booking_id as string))];
  const providerIds = [...new Set(payments.map((p) => p.provider_id))];

  const [{ data: bookings }, { data: profiles }] = await Promise.all([
    bookingIds.length > 0
      ? supabase.from("client_bookings").select("id, service").in("id", bookingIds)
      : Promise.resolve({ data: [] as { id: string; service: string }[] }),
    providerIds.length > 0
      ? supabase.from("tradesperson_profiles").select("id, full_name, username").in("id", providerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; username: string | null }[] }),
  ]);

  const serviceByBooking: Record<string, string> = {};
  for (const b of bookings ?? []) serviceByBooking[b.id as string] = b.service as string;

  const nameByProvider: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameByProvider[p.id as string] = String(p.username ?? p.full_name ?? "Pro");
  }

  return payments.map((p) => ({
    ...p,
    proName: nameByProvider[p.provider_id] ?? "Pro",
    description: p.booking_id ? (serviceByBooking[p.booking_id] ?? "Booking") : `Order #${p.order_id}`,
  }));
}
