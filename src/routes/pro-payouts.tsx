import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, ShieldCheck, Clock, FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchProPayoutReceipts, type PayoutReceiptRecord } from "@/lib/payments/ledger";
import { useCurrency } from "@/lib/currency";
import logoImg from "@/assets/logo-withoutBranding.png";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export const Route = createFileRoute("/pro-payouts")({
  head: () => ({
    meta: [
      { title: "Payouts — Capture Connect" },
      {
        name: "description",
        content: "All payouts you've received from the platform, with proof-of-payout receipts.",
      },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [receipts, setReceipts] = useState<PayoutReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      fetchProPayoutReceipts(uid)
        .then(setReceipts)
        .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load payouts."))
        .finally(() => setLoading(false));
    });
  }, []);

  // Each receipt row is one payout event — a lump-sum payout covering
  // several bookings still lands as a single row with the combined amount,
  // so totalReceived (a dollar sum) is accurate either way. But
  // totalPayouts is meant to count individual payouts released, not payout
  // events, so it sums each receipt's payment_ids rather than just counting
  // rows — otherwise a single bundled payout covering 5 bookings would
  // undercount as "1".
  const totalReceived = receipts.reduce((s, r) => s + r.amount, 0);
  const totalPayouts = receipts.reduce((s, r) => s + (r.payment_ids?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-1">
          <img
            src={logoImg}
            alt="Capture Connect – TradeHub Marketplace"
            className="h-10 w-auto object-contain"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-foreground">Capture Connect</span>
            <span className="text-xs font-medium text-amber-500 tracking-wide">TradeHub Marketplace</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Secure</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start py-8 px-4 sm:px-6">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Payouts</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Every payout the platform has sent you, with the proof-of-payout receipt attached by our team.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 text-center py-16">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Loading your payouts…</p>
            </div>
          ) : receipts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
              No payouts recorded yet. Once a payout is sent, it'll show up here with its receipt.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Total received</span>
                  <span className="text-xl font-bold text-emerald-500">{format(totalReceived)}</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Total Payouts
                  </span>
                  <span className="text-xl font-bold">{totalPayouts}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-border">
                        {["Receipt #", "Amount", "Transfer Method", "Transfer Date", "Expected Delivery", "Status", ""].map((h) => (
                          <th key={h} className="py-3 px-4 font-semibold text-primary whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium whitespace-nowrap">{r.receipt_number ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 font-semibold text-emerald-500 whitespace-nowrap">{format(r.amount)}</td>
                          <td className="px-4 text-muted-foreground whitespace-nowrap">{r.transfer_method ?? "—"}</td>
                          <td className="px-4 text-muted-foreground whitespace-nowrap">
                            {r.transfer_date ? formatDate(r.transfer_date) : formatDate(r.created_at)}
                          </td>
                          <td className="px-4 text-muted-foreground whitespace-nowrap">{r.expected_delivery ?? "—"}</td>
                          <td className="px-4 whitespace-nowrap">
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {r.status}
                            </span>
                          </td>
                          <td className="px-4 text-right whitespace-nowrap">
                            {r.receiptUrl ? (
                              <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-2">
                                  View Receipt <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">Receipt unavailable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => navigate({ to: "/pro-dashboard", search: { view: "payments" } })}>
              Back to Payments
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
