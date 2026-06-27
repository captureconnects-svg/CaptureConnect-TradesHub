import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  User,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Timer,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { fetchBookingById, markBookingPaid, type BookingRecord } from "@/backend/client-bookings";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/client-dashboard/booking-checkout/$id")({
  loader: async ({ params }) => {
    const booking = await fetchBookingById(params.id);
    return { booking };
  },
  head: () => ({ meta: [{ title: "Pay for Booking — Capture Connect" }] }),
  component: BookingCheckoutPage,
});

const TAX_RATE = 0.08;

function formatTime(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function BookingCheckoutPage() {
  const { booking } = Route.useLoaderData();

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
          <p className="font-semibold">Booking not found.</p>
          <Button asChild variant="outline">
            <Link to="/client-dashboard/bookings">Back to bookings</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (booking.status !== "confirmed") {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
          <p className="font-semibold">This booking is not yet confirmed.</p>
          <p className="text-sm text-muted-foreground">Payment is only available once the pro has confirmed your booking.</p>
          <Button asChild variant="outline">
            <Link to="/client-dashboard/bookings">Back to bookings</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (booking.paymentStatus === "paid") {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <p className="font-semibold text-lg">This booking is already paid.</p>
          <Button asChild variant="outline">
            <Link to="/client-dashboard/bookings">Back to bookings</Link>
          </Button>
        </main>
      </div>
    );
  }

  return <CheckoutForm booking={booking} />;
}

function CheckoutForm({ booking }: { booking: BookingRecord }) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [form, setForm] = useState({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserName(data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? "");
        setUserEmail(data.user.email ?? "");
      }
    });
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const subtotal = booking.price;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  const formattedDate = new Date(booking.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [startH, startM] = (booking.time ?? "00:00").split(":").map(Number);
  const timeDisplay =
    booking.duration > 0
      ? `${formatTime(startH, startM)} – ${formatTime(startH + Math.floor(booking.duration), startM + Math.round((booking.duration % 1) * 60))}`
      : formatTime(startH, startM);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    try {
      await markBookingPaid(booking.id);
      setStep("success");
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
        <main className="container mx-auto px-4 py-16 max-w-lg">
          <div className="rounded-3xl border border-border bg-card p-10 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Payment Confirmed!</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Your payment for the booking with {booking.pro} has been received.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-left space-y-1">
              <p className="text-xs text-muted-foreground">Booking reference</p>
              <p className="font-mono font-bold text-lg">{booking.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/client-dashboard/bookings">View My Bookings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/client-dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          to="/client-dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>

        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Pay for Booking
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* ── Payment Form ─────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Contact */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Contact Information
              </h2>
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={userName} readOnly className="bg-muted/30 cursor-default" placeholder="Loading…" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={userEmail} readOnly className="bg-muted/30 cursor-default" placeholder="Loading…" />
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Payment Details
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 -mt-2">
                <Lock className="h-3.5 w-3.5" /> Your payment info is encrypted and secure
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="cardName">Name on card</Label>
                <Input
                  id="cardName"
                  placeholder="Jane Doe"
                  required
                  value={form.cardName}
                  onChange={set("cardName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  required
                  maxLength={19}
                  value={form.cardNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                    setForm((f) => ({ ...f, cardNumber: digits.replace(/(\d{4})(?=\d)/g, "$1 ") }));
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    required
                    maxLength={5}
                    value={form.expiry}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setForm((f) => ({ ...f, expiry: d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    required
                    maxLength={3}
                    value={form.cvv}
                    onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <><Lock className="h-4 w-4" /> Pay ${grandTotal.toFixed(2)}</>
              )}
            </Button>
          </form>

          {/* ── Booking Summary ───────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold mb-4">Booking Summary</h2>

              {/* Pro info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border mb-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold">
                    {booking.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{booking.pro}</p>
                  <p className="text-xs text-muted-foreground">{booking.trade}</p>
                </div>
              </div>

              {/* Service details */}
              <div className="space-y-2.5 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <Package className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-right">{booking.service}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-right">{formattedDate}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium text-right">{timeDisplay}</span>
                  </div>
                </div>
                {booking.duration > 0 && (
                  <div className="flex items-start gap-2">
                    <Timer className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 flex justify-between gap-2">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{booking.duration}h</span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-right">{booking.location}</span>
                  </div>
                </div>
              </div>

              <Separator className="mb-4" />

              {/* Price breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{booking.packageName}</span>
                  <span>${booking.packagePrice.toFixed(2)}</span>
                </div>
                {booking.addons.map((a) => (
                  <div key={a.name} className="flex justify-between">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span>+${a.price.toFixed(2)}</span>
                  </div>
                ))}
                {booking.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tip</span>
                    <span>+${booking.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (est. 8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Secure checkout — SSL encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Your card details are never stored</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
