import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Calendar, CheckCircle2, Clock,
  MapPin, User, Package2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { TRADESPEOPLE, CATEGORIES, slugifyName, type Tradesperson } from "@/lib/trades-data";
import { TRADE_PACKAGES } from "@/lib/packages-data";
import { useCurrency } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { fetchTraderCardData } from "@/backend/client-trader-profile";
import { submitBooking, submitBookingAddons, fetchTraderConfirmedBookingDates } from "@/backend/client-bookings";

export const Route = createFileRoute("/client-dashboard/book/$id")({
  loader: async ({ params }) => {
    // Try static list first
    let pro: Tradesperson | undefined = TRADESPEOPLE.find((t) => t.id === params.id);

    if (pro) {
      const category = CATEGORIES.find((c) => c.slug === pro!.categorySlug);
      const packages = TRADE_PACKAGES[pro!.categorySlug] ?? TRADE_PACKAGES["construction"];
      return { pro, category, packages };
    }

    // Fall back to Supabase
    const [{ data: profile }, { data: specialties }] = await Promise.all([
      supabase
        .from("tradesperson_profiles")
        .select("id, full_name, username, location, about")
        .eq("id", params.id)
        .eq("active_role", true)
        .single(),
      supabase
        .from("tradesperson_specialty")
        .select("specialty")
        .eq("tradesperson_id", params.id),
    ]);

    if (!profile) throw notFound();

    const tradeNames = (specialties ?? []).map((r) => r.specialty as string);
    const primaryCat = CATEGORIES.find((c) => tradeNames.includes(c.name)) ?? CATEGORIES[0];
    const nameParts = String(
      (profile.username as string) ?? (profile.full_name as string) ?? ""
    )
      .split(" ")
      .filter(Boolean);
    const initials =
      nameParts
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "?";

    pro = {
      id: profile.id as string,
      urlSlug: slugifyName(String((profile.username as string) ?? (profile.full_name as string) ?? "")),
      name: String((profile.username as string) ?? (profile.full_name as string) ?? "Unknown"),
      trade: primaryCat.name,
      categorySlug: primaryCat.slug,
      location: String((profile.location as string) ?? ""),
      rating: 0,
      reviews: 0,
      hourly: 0,
      verified: false,
      initials,
      tagline: String((profile.about as string) ?? ""),
      specialties: tradeNames,
    };

    const category = CATEGORIES.find((c) => c.slug === pro!.categorySlug);

    // Use trader's own packages if configured, otherwise fall back to static packages
    const cardData = await fetchTraderCardData(params.id);
    const packages =
      cardData.packages.length > 0
        ? cardData.packages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            description: pkg.description,
            hours: pkg.hours,
            features: pkg.features,
            addons: cardData.addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
          }))
        : TRADE_PACKAGES[pro!.categorySlug] ?? TRADE_PACKAGES["construction"];

    return { pro, category, packages };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `Book ${loaderData?.pro.name ?? "Trader"} — TradeHub` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Trader not found</h1>
      <Button asChild>
        <Link to="/client-dashboard">Back to dashboard</Link>
      </Button>
    </div>
  ),
  component: BookingPage,
});

const TIP_PRESETS = [5, 10, 15, 20];

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  if (total >= 24 * 60) return "24:00";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function BookingPage() {
  const { pro, packages } = Route.useLoaderData();
  const { format } = useCurrency();

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [specialty, setSpecialty] = useState(pro.specialties?.[0] ?? pro.trade);

  // Client info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("full_name, username")
        .eq("id", data.user.id)
        .single();
      const name =
        (profile?.username as string | null)?.trim() ||
        (profile?.full_name as string | null)?.trim() ||
        "";
      setFullName(name);
    });
  }, []);

  const [confirmedSlots, setConfirmedSlots] = useState<{ date: string; time: string }[]>([]);

  useEffect(() => {
    fetchTraderConfirmedBookingDates(pro.id).then(setConfirmedSlots);
  }, [pro.id]);

  // Job details
  const [pkgIndex, setPkgIndex] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  // Add-ons & notes
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  // Tip
  const [tipMode, setTipMode] = useState<"" | "5" | "10" | "15" | "20" | "custom">("");
  const [customTip, setCustomTip] = useState("");

  const activePkg = packages[pkgIndex];

  const slotsOnDate = confirmedSlots.filter(s => s.date === date);
  const minAllowedTime = slotsOnDate.length > 0
    ? [...slotsOnDate.map(s => addHoursToTime(s.time.slice(0, 5), 2))].sort().at(-1)!
    : "";

  useEffect(() => {
    if (date && time && minAllowedTime && time < minAllowedTime) setTime("");
  }, [date, confirmedSlots]);

  const addonTotal = activePkg.addons
    .filter((a) => selectedAddons.has(a.name))
    .reduce((sum, a) => sum + a.price, 0);

  const tipAmount =
    tipMode === "custom"
      ? parseFloat(customTip) || 0
      : tipMode
      ? parseInt(tipMode, 10)
      : 0;

  const total = activePkg.price + addonTotal + tipAmount;

  const dateFullyBooked = minAllowedTime === "24:00";
  const timeConflict = Boolean(minAllowedTime && minAllowedTime !== "24:00" && time && time < minAllowedTime);
  const canSubmit = phone.trim() && date && time && location.trim() && !timeConflict && !dateFullyBooked;

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const bookingId = await submitBooking({
        tradespersonId: pro.id,
        fullName,
        phone,
        email,
        service: specialty,
        packageId: (activePkg as { id?: number }).id ?? null,
        requestDate: date,
        requestTime: time,
        duration: activePkg.hours,
        location,
        notes,
        tipsOptional: tipAmount,
        basePrice: activePkg.price,
        totalPrice: total,
        packagePrice: activePkg.price,
      });

      const selectedAddonObjects = activePkg.addons
        .filter((a) => selectedAddons.has(a.name))
        .filter((a): a is typeof a & { id: number } => typeof (a as { id?: number }).id === "number")
        .map((a) => ({ addonId: (a as { id: number }).id, price: a.price }));

      await submitBookingAddons(bookingId, selectedAddonObjects);
      setConfirmed(true);
    } catch (err) {
      console.error("Booking failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAddon = (name: string) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handlePkgChange = (value: string) => {
    setPkgIndex(Number(value));
    setSelectedAddons(new Set());
  };

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center space-y-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 mx-auto">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Booking Request Sent!</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {pro.name} will confirm your appointment shortly. A confirmation
              will be sent to <span className="text-foreground font-medium">{email}</span>.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-left space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {pro.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{pro.name}</p>
                <p className="text-xs text-muted-foreground">{pro.trade}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium">{activePkg.name} — {format(activePkg.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date &amp; Time</span>
                <span className="font-medium">
                  {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium truncate max-w-[180px]">{location}</span>
              </div>
              {addonTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span className="font-medium">+{format(addonTotal)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="font-medium">+{format(tipAmount)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{format(total)}</span>
            </div>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/client-dashboard/trader/$username" params={{ username: pro.urlSlug ?? pro.id }}>
              Back to {pro.name}'s Profile
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  // ── Booking form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back link */}
        <Link
          to="/client-dashboard/trader/$id"
          params={{ id: pro.id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {pro.name}'s profile
        </Link>

        {/* Page heading */}
        <div className="mt-5 mb-6">
          <h1 className="text-2xl font-bold">Book {pro.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {pro.trade} · {pro.location}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── LEFT: form sections ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* CLIENT INFORMATION */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Client Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    readOnly
                    className="bg-muted/40 cursor-default select-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="bg-muted/40 cursor-default select-none"
                />
              </div>
            </div>

            {/* JOB DETAILS */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Package2 className="h-4 w-4 text-primary" />
                Job Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="specialty">Trade / Specialty</Label>
                  {pro.specialties && pro.specialties.length > 1 ? (
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger id="specialty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pro.specialties.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                      {specialty}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="package">
                    Package <span className="text-destructive">*</span>
                  </Label>
                  <Select value={String(pkgIndex)} onValueChange={handlePkgChange}>
                    <SelectTrigger id="package">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg, i) => (
                        <SelectItem key={pkg.name} value={String(i)}>
                          {pkg.name} — {format(pkg.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date">
                    Preferred Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">
                    Preferred Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    min={minAllowedTime && minAllowedTime !== "24:00" ? minAllowedTime : undefined}
                    disabled={minAllowedTime === "24:00"}
                    onChange={(e) => setTime(e.target.value)}
                  />
                  {minAllowedTime === "24:00" ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      No available times on this date — choose another day.
                    </p>
                  ) : minAllowedTime ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      Earliest available: {minAllowedTime} (2 hrs after last confirmed booking)
                    </p>
                  ) : null}
                  {timeConflict && (
                    <p className="text-xs text-destructive">
                      Time conflicts with an existing booking. Choose {minAllowedTime} or later.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {activePkg.hours} {activePkg.hours === 1 ? "hour" : "hours"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">
                    Job Location <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. 123 Main St, Austin, TX"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ADD-ONS */}
            {activePkg.addons.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
                <h2 className="font-bold text-base">Add-ons</h2>
                <div className="space-y-3">
                  {activePkg.addons.map((addon) => (
                    <label
                      key={addon.name}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddons.has(addon.name)}
                        onChange={() => toggleAddon(addon.name)}
                        className="h-4 w-4 rounded accent-primary border-border"
                      />
                      <span className="flex-1 text-sm">{addon.name}</span>
                      <span className="text-sm font-semibold text-primary">
                        +{format(addon.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* NOTES */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-base">Notes</h2>
              <Textarea
                placeholder="Describe the work needed, any access instructions, or special requirements…"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* TIP */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <h2 className="font-bold text-base">
                Add a Tip{" "}
                <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {TIP_PRESETS.map((t) => {
                  const key = String(t) as typeof tipMode;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipMode(tipMode === key ? "" : key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        tipMode === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      {format(t)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setTipMode(tipMode === "custom" ? "" : "custom")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipMode === "custom"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  Custom
                </button>
              </div>
              {tipMode === "custom" && (
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="max-w-[180px]"
                />
              )}
            </div>
          </div>

          {/* ── RIGHT: price summary + submit ──────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Estimated price */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="font-bold text-base">Estimated Booking Price</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{activePkg.name} Package</span>
                  <span className="font-medium">{format(activePkg.price)}</span>
                </div>
                {[...selectedAddons].map((name) => {
                  const addon = activePkg.addons.find((a) => a.name === name);
                  return addon ? (
                    <div key={name} className="flex justify-between">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium">+{format(addon.price)}</span>
                    </div>
                  ) : null;
                })}
                {tipAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tip</span>
                    <span className="font-medium">+{format(tipAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{format(total)}</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={!canSubmit || submitting}
                onClick={handleConfirm}
              >
                <Calendar className="h-4 w-4" />
                {submitting ? "Submitting…" : "Confirm Booking"}
              </Button>

              {!canSubmit && (
                <p className="text-xs text-center text-muted-foreground">
                  Fill in all required fields to continue
                </p>
              )}
            </div>

            {/* Package features */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Package includes
                </p>
                <Badge variant="outline" className="text-xs font-mono">
                  {activePkg.hours}h
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{activePkg.description}</p>
              <div className="space-y-1.5">
                {activePkg.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-px" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trader info pill */}
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                  {pro.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{pro.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {pro.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
