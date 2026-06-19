import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Star,
  ShoppingBag,
  Timer,
  User,
  FileText,
  Package,
  Truck,
  Receipt,
  XCircle,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { fetchClientBookings, updateBookingStatus, type BookingRecord } from "@/backend/client-bookings";
import { fetchClientOrders, type OrderRecord } from "@/backend/client-shopping";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/client-dashboard/bookings")({
  head: () => ({
    meta: [
      { title: "Services — TradeHub" },
      { name: "description", content: "View and manage your TradeHub services and purchases." },
    ],
  }),
  component: BookingsPage,
});

type Booking = BookingRecord;

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-600 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatTime(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const formattedDate = new Date(booking.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [startH, startM] = (booking.time ?? "00:00").split(":").map(Number);
  const timeRange =
    booking.duration > 0
      ? `${formatTime(startH, startM)} - ${formatTime(startH + Math.floor(booking.duration), startM + Math.round((booking.duration % 1) * 60))}`
      : formatTime(startH, startM);

  const ref = booking.id.slice(0, 8);
  const bookedDate = new Date(booking.createdAt).toLocaleDateString("en-US");
  const isPaid = booking.paymentStatus === "paid";

  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      await updateBookingStatus(booking.id, "cancelled");
      setCancelOpen(false);
      toast.success("Booking cancelled successfully");
      router.invalidate();
    } catch {
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
              {booking.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold leading-tight">{booking.pro}</h3>
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 text-muted-foreground/30" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Ref: {ref}</p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize shrink-0 ${STATUS_STYLES[booking.status]}`}
              >
                {booking.status}
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: job details */}
          <div className="space-y-3.5">
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
                <p className="text-sm">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time</p>
                <p className="text-sm">{timeRange}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Timer className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
                <p className="text-sm">
                  {booking.duration > 0 ? `${booking.duration} hour${booking.duration !== 1 ? "s" : ""}` : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
                <p className="text-sm">{booking.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Session Type</p>
                <p className="text-sm">{booking.service}</p>
              </div>
            </div>
            {booking.notes && (
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{booking.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: booking details box */}
          <div className="relative rounded-xl bg-primary/8 p-4 overflow-hidden">
            <h4 className="font-bold text-primary mb-3">Booking Details</h4>
            <div className="space-y-1.5 text-sm relative z-10">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package:</span>
                <span className="font-semibold">{booking.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package Price:</span>
                <span className="font-medium">${booking.packagePrice.toFixed(2)}</span>
              </div>
              {booking.addons.length > 0 && (
                <>
                  <p className="text-muted-foreground pt-0.5">Add-ons:</p>
                  {booking.addons.map((a) => (
                    <div key={a.name} className="flex justify-between pl-2">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-primary">+${a.price.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
              {booking.tip > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip:</span>
                  <span className="font-medium text-primary">+${booking.tip.toFixed(2)}</span>
                </div>
              )}
            </div>
            <Separator className="my-3 bg-primary/20" />
            <div className="flex justify-between font-bold text-primary relative z-10">
              <span>Total Amount:</span>
              <span>${booking.price.toFixed(2)}</span>
            </div>
            {isPaid && (
              <span className="absolute bottom-2 right-3 text-green-500/20 font-black text-4xl tracking-widest select-none -rotate-12 pointer-events-none">
                PAID
              </span>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Date Booked: {bookedDate}
          </p>
          <div className="flex items-center gap-2">
            {booking.status === "pending" && (
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="text-xs h-7">
                    <XCircle className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your booking with {booking.pro}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelConfirm}
                      disabled={cancelling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelling ? "Cancelling…" : "Yes, Cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {booking.status === "confirmed" && !isPaid && (
              <Button size="sm" className="text-xs h-7" asChild>
                <Link to="/client-dashboard/booking-checkout/$id" params={{ id: booking.id }}>
                  <CreditCard className="h-3 w-3 mr-1" /> Pay Now
                </Link>
              </Button>
            )}
            {booking.status === "completed" && !booking.reviewed && (
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Star className="h-3 w-3 mr-1" /> Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderCard({ order }: { order: OrderRecord }) {
  const { format } = useCurrency();
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isDelivery = order.shippingMethod === "delivery";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">Order #{String(order.id).padStart(6, "0")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{orderDate}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="flex items-center gap-1 shrink-0"
          >
            {isDelivery ? (
              <><Truck className="h-3 w-3" /> Delivery</>
            ) : (
              <><Package className="h-3 w-3" /> Pickup</>
            )}
          </Badge>
        </div>

        <Separator className="my-4" />

        {/* ── Items ──────────────────────────────────────────────────── */}
        <div className="space-y-2 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.serviceName}
                  className="h-12 w-12 rounded-md object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.serviceName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium">{format(item.productPrice * item.quantity)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(item.productPrice)} × {item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="mb-4" />

        {/* ── Totals ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{format(order.subTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{order.shippingTotal > 0 ? format(order.shippingTotal) : "Free"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{format(order.tax)}</span>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <span className="font-bold">Total</span>
          <span className="font-bold text-primary text-lg">{format(order.totalPrice)}</span>
        </div>

        {isDelivery && order.shippingAddress && (
          <div className="mt-3 pt-3 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{order.shippingAddress}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PurchasesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">No purchases yet</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Items you buy from tradespeople will appear here after checkout.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-1">
        <Link to="/client-dashboard">Browse tradespeople</Link>
      </Button>
    </div>
  );
}

function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchClientBookings(), fetchClientOrders()])
      .then(([b, o]) => {
        setBookings(b);
        setOrders(o);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = bookings.filter((b) => {
    const [h = 0, m = 0] = (b.time ?? "00:00").split(":").map(Number);
    const bookingDateTime = new Date(`${b.date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    return bookingDateTime > now;
  });
  const past = bookings.filter((b) => {
    const [h = 0, m = 0] = (b.time ?? "00:00").split(":").map(Number);
    const bookingDateTime = new Date(`${b.date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    return bookingDateTime <= now;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/client-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Services</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-16">Loading your services…</p>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past Bookings ({past.length})</TabsTrigger>
              <TabsTrigger value="purchases">
                Past Purchases {orders.length > 0 && `(${orders.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">
                  No upcoming bookings.
                </p>
              ) : (
                upcoming.map((b) => <BookingCard key={b.id} booking={b} />)
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-4 space-y-3">
              {past.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">
                  No past bookings.
                </p>
              ) : (
                past.map((b) => <BookingCard key={b.id} booking={b} />)
              )}
            </TabsContent>

            <TabsContent value="purchases" className="mt-4 space-y-3">
              {orders.length === 0 ? (
                <PurchasesEmptyState />
              ) : (
                orders.map((o) => <OrderCard key={o.id} order={o} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
