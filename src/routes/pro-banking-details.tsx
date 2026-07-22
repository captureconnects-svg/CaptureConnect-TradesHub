import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Landmark, ShieldCheck, Clock, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { fetchBankDetails, saveBankDetails, deleteBankDetails, type BankDetails } from "@/backend/pro-banking";
import { CURRENCIES } from "@/lib/currency";
import logoImg from "@/assets/logo-withoutBranding.png";

export const Route = createFileRoute("/pro-banking-details")({
  head: () => ({
    meta: [
      { title: "Banking Details — Capture Connect" },
      {
        name: "description",
        content: "Add the bank account your automatic payouts should be sent to.",
      },
    ],
  }),
  component: BankingDetailsPage,
});

const ACCOUNT_TYPES = ["Checking", "Savings", "Business"];

const EMPTY_FORM: BankDetails = {
  fullName: "",
  nameOfBank: "",
  bankBranch: "",
  accountType: "",
  accountNumber: "",
  homeAddress: "",
  phone: "",
  country: "",
  currency: "",
};

const FIELD_LABELS: { key: keyof BankDetails; label: string }[] = [
  { key: "fullName", label: "Full name on account" },
  { key: "nameOfBank", label: "Bank name" },
  { key: "bankBranch", label: "Branch" },
  { key: "accountType", label: "Account type" },
  { key: "accountNumber", label: "Account number" },
  { key: "country", label: "Country" },
  { key: "currency", label: "Currency" },
  { key: "homeAddress", label: "Home address on bank account" },
  { key: "phone", label: "Phone number on bank account" },
];

function currencyDisplay(code: string): string {
  const meta = CURRENCIES.find((c) => c.code === code);
  return meta ? `${meta.symbol} ${meta.code} — ${meta.label}` : code;
}

function BankingDetailsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<BankDetails>(EMPTY_FORM);
  const [saved, setSaved] = useState<BankDetails | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchBankDetails()
      .then((existing) => {
        if (existing) {
          setForm(existing);
          setSaved(existing);
          setMode("view");
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load your banking details."))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof BankDetails>(key: K, value: BankDetails[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const isValid =
    form.fullName.trim() &&
    form.nameOfBank.trim() &&
    form.bankBranch.trim() &&
    form.accountType.trim() &&
    form.accountNumber.trim() &&
    form.homeAddress.trim() &&
    form.phone.trim() &&
    form.country.trim() &&
    form.currency.trim();

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await saveBankDetails(form);
      toast.success(saved ? "Banking details updated." : "Banking details saved. Your automatic payouts will be sent to this account.");
      setSaved(form);
      setMode("view");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save your banking details.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBankDetails();
      toast.success("Banking details deleted.");
      navigate({ to: "/pro-dashboard", search: { view: "payments" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete your banking details.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function handleCancelEdit() {
    if (saved) {
      setForm(saved);
      setMode("view");
    } else {
      navigate({ to: "/pro-dashboard", search: { view: "payments" } });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your banking details…</p>
        </div>
      </div>
    );
  }

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
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Banking Details</h1>
            <p className="text-muted-foreground text-sm">
              {mode === "view"
                ? "This is the bank account your automatic payouts are sent to."
                : "Tell us where to send your earnings. Payouts are sent automatically once a job is marked complete and verified — you'll never need to request one."}
            </p>
          </div>

          {mode === "view" && saved ? (
            <>
              <div className="rounded-xl border border-border bg-card p-6 divide-y divide-border">
                {FIELD_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                    <span className="text-sm font-medium text-right break-words">
                      {key === "currency" ? currencyDisplay(saved.currency) : saved[key]}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete banking details
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => navigate({ to: "/pro-dashboard", search: { view: "payments" } })}>
                    Back
                  </Button>
                  <Button onClick={() => setMode("edit")} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Update banking details
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name on account</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="As it appears on your bank account"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nameOfBank">Bank name</Label>
                    <Input
                      id="nameOfBank"
                      value={form.nameOfBank}
                      onChange={(e) => update("nameOfBank", e.target.value)}
                      placeholder="e.g. Chase Bank"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankBranch">Branch</Label>
                    <Input
                      id="bankBranch"
                      value={form.bankBranch}
                      onChange={(e) => update("bankBranch", e.target.value)}
                      placeholder="Branch name or code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="accountType">Account type</Label>
                    <Select value={form.accountType} onValueChange={(v) => update("accountType", v)}>
                      <SelectTrigger id="accountType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accountNumber">Account number</Label>
                    <Input
                      id="accountNumber"
                      inputMode="numeric"
                      value={form.accountNumber}
                      onChange={(e) => update("accountNumber", e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Account number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      placeholder="e.g. Jamaica"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.code} — {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeAddress">Home address on bank account</Label>
                  <Textarea
                    id="homeAddress"
                    value={form.homeAddress}
                    onChange={(e) => update("homeAddress", e.target.value)}
                    placeholder="Address on file with your bank"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number on bank account</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="Phone number on file with your bank"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!isValid || submitting}>
                  {submitting ? "Saving…" : saved ? "Update banking details" : "Save banking details"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banking details?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your saved bank account. You won't be able to receive automatic payouts
              until you add new banking details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
