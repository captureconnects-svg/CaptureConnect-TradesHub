import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  CreditCard,
  Lock,
  User,
  MapPin,
  Loader2,
  Minus,
  Plus,
  Trash2,
  Truck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { submitShoppingOrder } from "@/backend/client-shopping";
import { fetchDeliveryFee } from "@/backend/delivery-fee";

export const Route = createFileRoute("/client-dashboard/checkout")({
  head: () => ({ meta: [{ title: "Checkout — TradeHub" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, total, clearCart, updateQuantity, removeItem, itemCount } = useCart();
  const { format } = useCurrency();

  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [userInfo, setUserInfo] = useState({ fullName: "", email: "" });
  const [traderDeliveryFee, setTraderDeliveryFee] = useState<number>(9.99);

  const [form, setForm] = useState({
    phone: "",
    deliveryMethod: "pickup" as "pickup" | "delivery",
    address: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserInfo({
          fullName:
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            "",
          email: data.user.email ?? "",
        });
      }
    });
  }, []);

  useEffect(() => {
    const traderId = items[0]?.traderId;
    if (!traderId) return;
    fetchDeliveryFee(traderId).then((fee) => {
      if (fee !== null) setTraderDeliveryFee(fee);
    });
  }, [items]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const shippingCost = form.deliveryMethod === "delivery" ? traderDeliveryFee : 0;
  const tax = total * 0.08;
  const grandTotal = total + shippingCost + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tradespersonId = items[0]?.traderId ?? "";
      const orderId = await submitShoppingOrder({
        tradespersonId,
        fullName: userInfo.fullName,
        email: userInfo.email,
        phone: form.phone,
        shippingMethod: form.deliveryMethod,
        shippingAddress: form.deliveryMethod === "delivery" ? form.address : "",
        nameOnCard: form.cardName,
        last4Card: form.cardNumber.replace(/\s/g, "").slice(-4),
        subTotal: total,
        shippingTotal: shippingCost,
        tax,
        totalPrice: grandTotal,
        cartItems: items,
      });
      setOrderNumber(`TH-${String(orderId).padStart(6, "0")}`);
      clearCart();
      setStep("success");
    } catch (err) {
      console.error("Order failed:", err);
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
              <h1 className="text-2xl font-bold">Order Confirmed!</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Your order has been placed. You'll receive a confirmation email shortly.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">Order number</p>
              <p className="font-mono font-bold text-lg mt-1">{orderNumber}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/client-dashboard">Continue Shopping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/client-dashboard/bookings">View Orders</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="rounded-3xl border border-border bg-card p-10 space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h1 className="text-xl font-bold">Your cart is empty</h1>
            <p className="text-muted-foreground text-sm">
              Browse a trader's profile and add services to your cart to get started.
            </p>
            <Button asChild size="lg">
              <Link to="/client-dashboard">Browse Traders</Link>
            </Button>
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
          to="/client-dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shopping
        </Link>

        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Checkout
          <Badge variant="secondary" className="ml-1">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </Badge>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* ── Form ─────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Contact */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Contact Information
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={userInfo.fullName}
                  readOnly
                  className="bg-muted/30 cursor-default"
                  placeholder="Loading..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userInfo.email}
                  readOnly
                  className="bg-muted/30 cursor-default"
                  placeholder="Loading..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>
            </div>

            {/* Delivery Method */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Delivery Method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.deliveryMethod === "pickup"
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    className="sr-only"
                    checked={form.deliveryMethod === "pickup"}
                    onChange={() => setForm((f) => ({ ...f, deliveryMethod: "pickup" }))}
                  />
                  <Package
                    className={`h-6 w-6 ${form.deliveryMethod === "pickup" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-sm font-medium ${form.deliveryMethod === "pickup" ? "text-primary" : ""}`}
                  >
                    Pickup
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Pick up from the tradesperson
                  </span>
                </label>

                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.deliveryMethod === "delivery"
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="delivery"
                    className="sr-only"
                    checked={form.deliveryMethod === "delivery"}
                    onChange={() => setForm((f) => ({ ...f, deliveryMethod: "delivery" }))}
                  />
                  <Truck
                    className={`h-6 w-6 ${form.deliveryMethod === "delivery" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-sm font-medium ${form.deliveryMethod === "delivery" ? "text-primary" : ""}`}
                  >
                    Delivery
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Delivered to your address (+{format(traderDeliveryFee)})
                  </span>
                </label>
              </div>

              {form.deliveryMethod === "delivery" && (
                <div className="space-y-1.5">
                  <Label htmlFor="address">Street address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    required
                    value={form.address}
                    onChange={set("address")}
                  />
                </div>
              )}
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
                    setForm((f) => ({
                      ...f,
                      cardNumber: digits.replace(/(\d{4})(?=\d)/g, "$1 "),
                    }));
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
                      setForm((f) => ({
                        ...f,
                        expiry: d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d,
                      }));
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Place Order — {format(grandTotal)}
                </>
              )}
            </Button>
          </form>

          {/* ── Order Summary ─────────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.serviceName}
                        className="h-12 w-12 rounded-lg object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {item.traderInitials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{item.serviceName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.traderName}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{format(item.price * item.quantity)}</p>
                      <p className="text-xs text-muted-foreground">{format(item.price)} ea</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{format(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{form.deliveryMethod === "delivery" ? format(shippingCost) : "Free"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (est. 8%)</span>
                  <span>{format(tax)}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">{format(grandTotal)}</span>
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
