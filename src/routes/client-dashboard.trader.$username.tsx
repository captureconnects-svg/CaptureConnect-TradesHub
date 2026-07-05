import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { ArrowLeft, Star, MapPin, BadgeCheck, Clock, Award, Calendar, MessageSquare, Heart, Share2, Briefcase, Users, TrendingUp, Camera, CheckCircle2, Zap, Send, Copy, Link as LinkIcon, ShoppingCart, Minus, Plus, Trash2, Eye, ChevronLeft, ChevronRight, Paperclip, X, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { SavedSheet } from "@/components/trade/SavedSheet";
import { TRADESPEOPLE, CATEGORIES, type Tradesperson } from "@/lib/trades-data";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart-context";
import { fetchTraderCardData, type TraderCardData, type TraderProduct } from "@/backend/client-trader-profile";
import { fetchClientLikes, toggleClientLike } from "@/backend/client-likes";
import { logActivity } from "@/backend/pro-activity";
import {
  submitClientReview,
  deleteClientReview,
  fetchTraderReviews,
  fetchTraderRatingStats,
  type ClientReview,
} from "@/backend/client-reviews";
import { getTraderDisplayFlags, getTraderCartItems, getTraderItemCount, getTraderCartTotal } from "@/backend/client-trader-display-flags";
import { fetchTraderConfirmedBookingDates } from "@/backend/client-bookings";
import { supabase } from "@/lib/supabase";
import {
  getOrCreateConversation,
  fetchMessages,
  sendMessageWithFile,
  type ConversationMessage,
} from "@/backend/conversations";

export const Route = createFileRoute("/client-dashboard/trader/$username")({
  validateSearch: (search: Record<string, unknown>): { preview?: boolean; from?: string } => {
    const result: { preview?: boolean; from?: string } = {};
    if (search.preview === "true" || search.preview === true) result.preview = true;
    if (typeof search.from === "string" && search.from) result.from = search.from;
    return result;
  },
  // Keep SSR data fresh for 60 s so the client does not immediately re-run the
  // loader after hydration. A re-run that races with Supabase session init can
  // return null and incorrectly throw notFound(), replacing the rendered profile
  // with a blank dark screen.
  staleTime: 60_000,
  loader: async ({ params }) => {
    const slug = params.username;

    // Try static demo list first (uses id as the slug)
    let pro: Tradesperson | undefined = TRADESPEOPLE.find((t) => t.id === slug);
    let tradespersonId = slug;

    if (!pro) {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Try username match (case-insensitive — slugifyName lowercases the name for the URL)
      const { data: byUsername, error: usernameErr } = await supabase
        .from("tradesperson_profiles")
        .select("id, full_name, username, location, about, profile_image")
        .ilike("username", slug)
        .maybeSingle();

      // A Supabase error (RLS, network, etc.) is not a 404 — don't throw notFound
      if (usernameErr && !byUsername) throw usernameErr;

      let profileData = byUsername ?? null;

      // Try UUID lookup (only if slug is a valid UUID to avoid cast errors)
      if (!profileData && uuidRe.test(slug)) {
        const { data: byId, error: idErr } = await supabase
          .from("tradesperson_profiles")
          .select("id, full_name, username, location, about, profile_image")
          .eq("id", slug)
          .maybeSingle();
        if (idErr && !byId) throw idErr;
        profileData = byId ?? null;
      }

      // Fall back to full_name slug match (e.g. "john-smith" → "john smith")
      if (!profileData) {
        const { data: byName, error: nameErr } = await supabase
          .from("tradesperson_profiles")
          .select("id, full_name, username, location, about, profile_image")
          .ilike("full_name", slug.replace(/-/g, " "))
          .limit(1)
          .maybeSingle();
        if (nameErr && !byName) throw nameErr;
        profileData = byName ?? null;
      }

      if (!profileData) throw notFound();

      tradespersonId = profileData.id as string;

      const { data: specialtiesData } = await supabase
        .from("tradesperson_specialty")
        .select("specialty")
        .eq("tradesperson_id", tradespersonId);

      const tradeNames = (specialtiesData ?? []).map((r) => r.specialty as string);
      const primaryCat = CATEGORIES.find((c) => tradeNames.includes(c.name)) ?? CATEGORIES[0];
      const nameParts = String(
        (profileData.username as string) ?? (profileData.full_name as string) ?? ""
      )
        .split(" ")
        .filter(Boolean);
      const initials =
        nameParts
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join("") || "?";

      pro = {
        id: tradespersonId,
        urlSlug: slug,
        name: String((profileData.username as string) ?? (profileData.full_name as string) ?? "Unknown"),
        trade: primaryCat.name,
        categorySlug: primaryCat.slug,
        location: String((profileData.location as string) ?? ""),
        rating: 0,
        reviews: 0,
        hourly: 0,
        verified: false,
        initials,
        tagline: String((profileData.about as string) ?? ""),
        specialties: tradeNames,
        profileImage: String((profileData.profile_image as string) ?? ""),
      };
    }

    // Don't return the full category object — it contains a non-serialisable
    // LucideIcon function that is silently dropped by JSON serialisation and
    // causes a server/client hydration mismatch. The component resolves it
    // client-side from CATEGORIES using categorySlug.
    const cardData = await fetchTraderCardData(tradespersonId);
    return { pro: pro!, cardData };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.pro.name ?? "Trader"} — Capture Connect` },
      {
        name: "description",
        content: `View ${loaderData?.pro.name}'s profile on TradeHub. ${loaderData?.pro.tagline}`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Trader not found</h1>
      <Button asChild>
        <Link to="/client-dashboard">Back to dashboard</Link>
      </Button>
    </div>
  ),
  component: TraderProfilePage,
});

// ─── UI constants ─────────────────────────────────────────────────────────────

const PORTFOLIO_GRADIENTS = [
  "from-primary/30 to-primary/10",
  "from-blue-500/30 to-cyan-500/10",
  "from-amber-500/30 to-orange-500/10",
  "from-green-500/30 to-emerald-500/10",
  "from-violet-500/30 to-purple-500/10",
  "from-rose-500/30 to-pink-500/10",
];

const CAL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Star renderer ────────────────────────────────────────────────────────────
function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sz} ${i < Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon?: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Availability Calendar ────────────────────────────────────────────────────
function AvailabilityCalendar({ workingHours, confirmedBookings = [] }: {
  workingHours: { day: string; open: boolean }[];
  confirmedBookings?: { date: string; time: string }[];
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const openDayNames = new Set(workingHours.filter((h) => h.open).map((h) => h.day));
  const confirmedDateSet = new Set(confirmedBookings.map((b) => b.date));

  const monthBookings = confirmedBookings
    .filter((b) => {
      const [y, m] = b.date.split("-").map(Number);
      return y === year && m === month + 1;
    })
    .sort((a, z) => a.date.localeCompare(z.date) || a.time.localeCompare(z.time));

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPast = (d: number) => new Date(year, month, d) < todayStart;
  const isToday = (d: number) =>
    year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  const isConfirmedBooking = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return confirmedDateSet.has(dateStr) && !isPast(d);
  };
  const isAvailable = (d: number) => {
    const dayName = CAL_DAY_NAMES[new Date(year, month, d).getDay()];
    return openDayNames.has(dayName) && !isPast(d) && !isConfirmedBooking(d);
  };
  const isClosed = (d: number) => {
    const dayName = CAL_DAY_NAMES[new Date(year, month, d).getDay()];
    return !openDayNames.has(dayName) && !isPast(d) && !isConfirmedBooking(d);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Availability Calendar
      </h2>
      <p className="text-sm text-muted-foreground mb-5">See when this professional is available for bookings</p>

      <div className="flex gap-4 items-start">
        {/* Calendar grid */}
        <div className="w-3/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Prev
            </button>
            <span className="font-semibold text-sm">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const confirmed = isConfirmedBooking(day);
              const avail = isAvailable(day);
              const closed = isClosed(day);
              const past = isPast(day);
              const todayCell = isToday(day);

              let cellClass = "aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors border";
              if (confirmed) cellClass += " border-amber-500 text-amber-400 bg-amber-500/10 cursor-default";
              else if (avail) cellClass += " border-green-500 text-green-400 hover:bg-green-500/20 cursor-pointer";
              else if (closed) cellClass += " border-red-500/60 text-red-400/80 cursor-default";
              else if (past) cellClass += " border-transparent text-muted-foreground/30 cursor-default";
              else cellClass += " border-transparent text-muted-foreground/30 cursor-default";
              if (todayCell) cellClass += " ring-2 ring-primary ring-offset-1";

              return (
                <button key={day} type="button" disabled={!avail} className={cellClass}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend + Unavailable Slots panel */}
        <div className="flex-1 min-w-0 rounded-xl bg-muted/30 border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
            <span className="text-xs font-medium">Closed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
            <span className="text-xs font-medium">Confirmed Booking</span>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Unavailable Slots</p>
            {monthBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No confirmed bookings this month.</p>
            ) : (
              <div className="space-y-1.5">
                {monthBookings.map((b, idx) => {
                  const dateObj = new Date(b.date + "T00:00:00");
                  const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div key={idx} className="flex items-start gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div>
                        <span className="text-xs font-medium">{dateLabel}</span>
                        <span className="text-xs text-muted-foreground"> · {formatTime(b.time)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Write Review Dialog ──────────────────────────────────────────────────────
function WriteReviewDialog({
  name,
  tradespersonId,
  onReviewSubmitted,
  className,
  disabled,
}: {
  name: string;
  tradespersonId: string;
  onReviewSubmitted?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitClientReview({ tradespersonId, rating, title, description: body });
      setSubmitted(true);
      onReviewSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className={`gap-2${className ? ` ${className}` : ""}`} disabled={disabled}>
          <MessageSquare className="h-4 w-4" />
          Write Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {name}</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <p className="font-semibold text-lg">Review submitted!</p>
            <p className="text-sm text-muted-foreground">Thanks for sharing your experience.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Your rating</Label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHover(i + 1)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(i + 1)}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        i < (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-title">Title</Label>
              <Input
                id="review-title"
                placeholder="Summarise your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-body">Review</Label>
              <Textarea
                id="review-body"
                placeholder="Tell others about the quality of work, communication, and value…"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={rating === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Book Now Button ──────────────────────────────────────────────────────────
function BookNowButton({ proId, className, disabled }: { proId: string; className?: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <Button size="lg" className={`gap-2${className ? ` ${className}` : ""}`} disabled>
        <Calendar className="h-4 w-4" />
        Book Now
      </Button>
    );
  }
  return (
    <Button size="lg" className={`gap-2${className ? ` ${className}` : ""}`} asChild>
      <Link to="/client-dashboard/book/$id" params={{ id: proId }}>
        <Calendar className="h-4 w-4" />
        Book Now
      </Link>
    </Button>
  );
}

// ─── All Reviews Dialog ───────────────────────────────────────────────────────
type Review = { name: string; rating: number; text: string; date: string; jobType: string };
type RatingRow = { star: number; pct: number };

function AllReviewsDialog({
  reviews,
  rating,
  reviewCount,
  ratingBreakdown,
  proName,
  disabled,
  dbReviews,
  currentClientId,
  onDeleteReview,
}: {
  reviews: Review[];
  rating: number;
  reviewCount: number;
  ratingBreakdown: RatingRow[];
  proName: string;
  disabled?: boolean;
  dbReviews?: ClientReview[];
  currentClientId?: string | null;
  onDeleteReview?: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>View All</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Reviews — {proName}</DialogTitle>
        </DialogHeader>

        {/* Stats summary */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 mt-2">
          <div className="text-center shrink-0">
            <p className="text-4xl font-bold text-primary">{rating}</p>
            <Stars rating={rating} size="sm" />
            <p className="text-xs text-muted-foreground mt-1">{reviewCount} reviews</p>
          </div>
          <Separator orientation="vertical" className="h-16 shrink-0" />
          <div className="flex-1 space-y-1.5">
            {ratingBreakdown.map(({ star, pct }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4 text-right">{star}</span>
                <Star className="h-3 w-3 fill-primary text-primary shrink-0" />
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground w-6">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {reviews.map((review, i) => {
              const dbReview = dbReviews?.[i];
              const isOwner = currentClientId && dbReview?.clientId === currentClientId;
              return (
                <div key={i} className="border-l-2 border-blue-500 pl-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {review.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{review.name}</p>
                        <p className="text-xs text-muted-foreground">{review.jobType} · {review.date}</p>
                      </div>
                    </div>
                    {isOwner && onDeleteReview && dbReview && (
                      <DeleteReviewDialog reviewId={dbReview.id} onDeleted={onDeleteReview} />
                    )}
                  </div>
                  <Stars rating={review.rating} size="sm" />
                  <p className="text-sm text-muted-foreground mt-1.5">"{review.text}"</p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Send Message Dialog ──────────────────────────────────────────────────────
function SendMessageDialog({
  name,
  tradespersonId,
  disabled,
}: {
  name: string;
  tradespersonId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [convoId, setConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const id = await getOrCreateConversation(tradespersonId);
        setConvoId(id);
        const msgs = await fetchMessages(id);
        setMessages(msgs);
      } catch {
        // not authenticated or network error
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tradespersonId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !file) || sending || !convoId) return;
    setSending(true);
    try {
      const msg = await sendMessageWithFile({ convoId, content: text, file, tradespersonId });
      setMessages((prev) => [...prev, msg]);
      setInput("");
      setFile(null);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    e.target.value = "";
  };

  const renderFileUrl = (fileUrl: string, isOwn: boolean) => {
    const isImage = /\.(jpe?g|png|gif|webp|svg)$/i.test(fileUrl);
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(fileUrl);
    if (isImage)
      return (
        <img
          src={fileUrl}
          alt="attachment"
          className="max-w-[180px] rounded-lg border border-border mt-1"
        />
      );
    if (isVideo)
      return (
        <video
          src={fileUrl}
          controls
          className="max-w-[180px] rounded-lg border border-border mt-1"
        />
      );
    const fileName = fileUrl.split("/").pop() ?? "file";
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1.5 text-xs underline mt-1 ${isOwn ? "text-primary-foreground/80" : "text-primary"}`}
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        {fileName}
      </a>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2" size="lg" disabled={disabled}>
          <MessageSquare className="h-4 w-4" />
          Send Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {/* Message history */}
          <div className="h-72 overflow-y-auto flex flex-col gap-2 p-3 rounded-xl bg-muted/30 border border-border">
            {loading ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-background border border-border rounded-bl-sm"
                    }`}
                  >
                    {msg.content && <p>{msg.content}</p>}
                    {msg.fileUrl && <div>{renderFileUrl(msg.fileUrl, msg.isOwn)}</div>}
                    <p
                      className={`text-xs mt-1 ${
                        msg.isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Staged file */}
          {file && (
            <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2 py-1 border border-border text-xs w-fit">
              <span className="truncate max-w-[160px]">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && !file) || sending || !convoId}
              size="icon"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Share Profile Dialog ─────────────────────────────────────────────────────
function ShareProfileDialog({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (open) setShareUrl(window.location.href);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // fallback: let the user manually copy from the input
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full">
          <Share2 className="h-4 w-4" />
          Share Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {name}'s Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Copy the link below to share this profile with others.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
            <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="min-w-0 flex-1 bg-transparent text-xs text-muted-foreground outline-none cursor-text"
            />
          </div>
          <Button
            onClick={copy}
            className="w-full gap-2"
            variant={copied ? "secondary" : "default"}
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copied!" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cart Sheet ───────────────────────────────────────────────────────────────
function CartSheet({ open, onOpenChange, traderId }: { open: boolean; onOpenChange: (v: boolean) => void; traderId: string }) {
  const { items: allItems, removeItem, updateQuantity, clearCart } = useCart();
  const { format } = useCurrency();

  const items = getTraderCartItems(allItems, traderId);
  const itemCount = getTraderItemCount(allItems, traderId);
  const total = getTraderCartTotal(allItems, traderId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {itemCount > 0 && (
              <Badge variant="secondary" className="ml-1">{itemCount}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Add products from the shop below to get started.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-3 py-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.serviceName}
                        className="h-12 w-12 rounded-lg object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                          {item.traderInitials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{item.serviceName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.traderName}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{format(item.price * item.quantity)}</p>
                      <p className="text-xs text-muted-foreground">{format(item.price)} ea</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-2 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t border-border space-y-3 bg-card shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
                </span>
                <span className="font-bold text-lg">{format(total)}</span>
              </div>
              <Button size="lg" className="w-full gap-2" asChild onClick={() => onOpenChange(false)}>
                <Link to="/client-dashboard/checkout">
                  <ShoppingCart className="h-4 w-4" />
                  Proceed to Checkout
                </Link>
              </Button>
              <button
                type="button"
                onClick={clearCart}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Image Slider ─────────────────────────────────────────────────────────────
function ImageSlider({
  images,
  alt,
  className,
  fallbackGradient,
}: {
  images: string[];
  alt: string;
  className?: string;
  fallbackGradient?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());

  const showNav = images.length > 1;
  const imgSrc = images[idx];
  const hasError = errors.has(idx);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {!imgSrc || hasError ? (
        <div className={`h-full w-full bg-gradient-to-br ${fallbackGradient ?? "from-primary/30 to-primary/10"}`} />
      ) : (
        <img
          key={idx}
          src={imgSrc}
          alt={`${alt} ${idx + 1}`}
          className="h-full w-full object-cover"
          onError={() => setErrors((s) => { const n = new Set(s); n.add(idx); return n; })}
        />
      )}

      {showNav && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all ${
                  i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Product Detail Dialog ────────────────────────────────────────────────────
function ProductDetailDialog({
  product,
  gradientIndex,
  proId,
  traderName,
  traderInitials,
  onClose,
  cartDisabled,
}: {
  product: TraderProduct;
  gradientIndex: number;
  proId: string;
  traderName: string;
  traderInitials: string;
  onClose: () => void;
  cartDisabled?: boolean;
}) {
  const { format } = useCurrency();
  const { items, addItem, updateQuantity } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants[0]?.id ?? null
  );

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;

  const itemId = selectedVariant
    ? `${proId}-${product.id}-v${selectedVariant.id}`
    : `${proId}-${product.id}`;
  const cartItem = items.find((i) => i.id === itemId);
  const qty = cartItem?.quantity ?? 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Image / gradient header */}
        <div className="relative h-52 sm:h-60 shrink-0">
          <ImageSlider
            images={product.images}
            alt={product.name}
            className="h-full w-full"
            fallbackGradient={PORTFOLIO_GRADIENTS[gradientIndex % PORTFOLIO_GRADIENTS.length]}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl leading-tight">{product.name}</DialogTitle>
          </DialogHeader>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Variant selector */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const label =
                    [v.size, v.color].filter(Boolean).join(" / ") || `Option ${v.id}`;
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={v.quantity === 0}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : v.quantity === 0
                          ? "border-border/50 text-muted-foreground/40 cursor-not-allowed"
                          : "border-border bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Price + cart controls */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
              <p className="text-2xl font-bold text-primary">{format(displayPrice)}</p>
              {selectedVariant && selectedVariant.quantity > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedVariant.quantity} in stock
                </p>
              )}
            </div>
            {qty > 0 && !cartDisabled ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(itemId, qty - 1)}
                  className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-base font-bold w-6 text-center">{qty}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(itemId, qty + 1)}
                  className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                className="gap-2"
                disabled={cartDisabled || (product.variants.length > 0 && !selectedVariant)}
                onClick={() =>
                  addItem({
                    id: itemId,
                    traderId: proId,
                    traderName,
                    traderInitials,
                    serviceName: selectedVariant
                      ? `${product.name} (${[selectedVariant.size, selectedVariant.color].filter(Boolean).join(" / ")})`
                      : product.name,
                    price: displayPrice,
                    variantId: selectedVariant?.id ?? null,
                    imgId: product.imageIds[0] ?? null,
                    imageUrl: product.images[0] ?? null,
                  })
                }
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Review Dialog ─────────────────────────────────────────────────────
function DeleteReviewDialog({ reviewId, onDeleted }: { reviewId: number; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClientReview(reviewId);
      setOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors shrink-0"
          aria-label="Delete review"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Review</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete your review? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function TraderProfilePage() {
  const { pro, cardData } = Route.useLoaderData() as { pro: Tradesperson; cardData: TraderCardData };
  const { preview: isPreview, from: fromSlug } = Route.useSearch();
  const category = CATEGORIES.find((c) => c.slug === pro.categorySlug);
  const displayCategory = (fromSlug ? CATEGORIES.find((c) => c.slug === fromSlug) : undefined) ?? category;
  const { format } = useCurrency();
  const { items: allCartItems } = useCart();
  const traderItemCount = getTraderItemCount(allCartItems, pro.id);
  const [liked, setLiked] = useState(false);
  const [likedCount, setLikedCount] = useState(0);
  const [showLikes, setShowLikes] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null);

  const [clientId, setClientId] = useState<string | null>(null);
  const [viewerIsPro, setViewerIsPro] = useState(false);
  const [dbReviews, setDbReviews] = useState<ClientReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewKey, setReviewKey] = useState(0);
  const [confirmedBookings, setConfirmedBookings] = useState<{ date: string; time: string }[]>([]);

  useEffect(() => {
    async function loadLikeState() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const uid = authData.user.id;
      setClientId(uid);
      const likes = await fetchClientLikes(uid);
      setLiked(likes.includes(pro.id));
      setLikedCount(likes.length);
      const { data: proProfile } = await supabase
        .from("tradesperson_profiles")
        .select("active_role")
        .eq("id", uid)
        .maybeSingle();
      if (proProfile?.active_role === true) setViewerIsPro(true);
    }
    loadLikeState();
  }, [pro.id]);

  useEffect(() => {
    if (isPreview) return;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id === pro.id) return;
      const { data: cp } = await supabase
        .from("client_profiles")
        .select("full_name, username")
        .eq("id", authData.user.id)
        .single();
      const name =
        (cp?.username as string | null)?.trim() ||
        (cp?.full_name as string | null)?.trim() ||
        "Someone";
      await logActivity({
        tradespersonId: pro.id,
        activityType: "profile_view",
        description: `${name} viewed your profile`,
        clientId: authData.user.id,
      });
    })().catch(() => {});
  }, [pro.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadReviews() {
      const [fetched, stats] = await Promise.all([
        fetchTraderReviews(pro.id),
        fetchTraderRatingStats(pro.id),
      ]);
      setDbReviews(fetched);
      setAvgRating(stats.avgRating);
      setReviewCount(stats.totalReviews);
    }
    loadReviews();
  }, [pro.id, reviewKey]);

  useEffect(() => {
    fetchTraderConfirmedBookingDates(pro.id).then(setConfirmedBookings).catch(() => {});
  }, [pro.id]);

  const handleToggleLike = () => {
    if (!clientId || isPreview || viewerIsPro) return;
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikedCount((n) => (nowLiked ? n + 1 : Math.max(0, n - 1)));
    toggleClientLike(clientId, pro.id, !nowLiked);
  };

  const flags = getTraderDisplayFlags(cardData.tradeSpecialties);
  const activePkg = cardData.packages[selectedPkg] ?? null;
  const Icon = displayCategory?.icon ?? Zap;
  const gradient = displayCategory?.gradient ?? "from-primary/30 to-primary/10";

  const reviews: Review[] = dbReviews.map((r) => ({
    name: r.clientName,
    rating: r.rating,
    text: r.description,
    date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    jobType: r.title || "General Review",
  }));

  const ratingBreakdown: RatingRow[] = [5, 4, 3, 2, 1].map((star) => {
    const count = dbReviews.filter((r) => r.rating === star).length;
    const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
    return { star, pct };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isPreview && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0" />
            <span>Preview mode — this is how clients see your profile.</span>
          </div>
          <Link
            to="/pro-dashboard"
            className="flex items-center gap-1 shrink-0 underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      )}
      {!isPreview && <DashboardHeader likedCount={likedCount} onOpenLikes={() => setShowLikes(true)} />}

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Back link */}
        {viewerIsPro ? (
          <Link
            to="/pro-dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        ) : (
          <Link
            to="/client-dashboard/category/$slug"
            params={{ slug: displayCategory?.slug ?? pro.categorySlug }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {displayCategory?.name ?? "listings"}
          </Link>
        )}

        {/* ── HEADER / HERO ─────────────────────────────────────────────── */}
        <section className={`mt-4 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${gradient}`}>
          <div className="absolute inset-0 bg-background/50" />
          <div className="relative p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background shadow-xl">
                  {cardData.profileImage && (
                    <AvatarImage src={cardData.profileImage} alt={cardData.fullName || pro.name} />
                  )}
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                    {pro.initials}
                  </AvatarFallback>
                </Avatar>
                {pro.verified && (
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 shadow">
                    <BadgeCheck className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {cardData.username || cardData.fullName || pro.name}
                  </h1>
                  {pro.verified && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <BadgeCheck className="h-3 w-3" /> Verified Pro
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-md bg-background/70 backdrop-blur flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground/90">{displayCategory?.name ?? pro.trade}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {cardData.location || pro.location}
                  </span>
                  {cardData.responseTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Responds within {cardData.responseTime}h
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {cardData.yearsExp > 0 ? `${cardData.yearsExp} yrs experience` : "Experience not specified"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <Stars rating={avgRating} size="md" />
                  <span className="font-semibold">{avgRating > 0 ? avgRating : "—"}</span>
                  <span className="text-muted-foreground text-sm">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {flags.showBookingButton && <BookNowButton proId={pro.id} disabled={isPreview || viewerIsPro} />}
                  <WriteReviewDialog
                    name={cardData.username || cardData.fullName || pro.name}
                    tradespersonId={pro.id}
                    onReviewSubmitted={() => setReviewKey((k) => k + 1)}
                    disabled={isPreview || viewerIsPro}
                  />
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    disabled={isPreview || viewerIsPro}
                    className="p-2 rounded-lg border border-border bg-background/70 hover:bg-muted/50 transition-colors disabled:pointer-events-none disabled:opacity-50"
                    aria-label={liked ? "Unsave" : "Save"}
                  >
                    <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                </div>
              </div>

              {/* Rate card */}
              <div className="shrink-0 rounded-2xl border border-border bg-background/80 backdrop-blur p-5 text-center min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Starting Rate</p>
                <p className="text-3xl font-bold text-primary">
                  {cardData.startingPrice > 0 ? format(cardData.startingPrice) : "—"}
                </p>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  {cardData.yearsExp > 0 ? `${cardData.yearsExp} yrs experience` : "Experienced"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* ABOUT */}
            <Section title="About" icon={Briefcase}>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                {cardData.bio ? (
                  <p>{cardData.bio}</p>
                ) : (
                  <p className="italic text-muted-foreground/60">No bio provided yet.</p>
                )}
              </div>
            </Section>

            {/* PORTFOLIO */}
            {flags.showPortfolio && (
              <Section title="Portfolio" icon={Camera}>
                {cardData.portfolios.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <Camera className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No portfolio items uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cardData.portfolios.map((portfolio, pi) => (
                      <div key={portfolio.id}>
                        <div className="mb-2">
                          <p className="font-semibold text-sm">{portfolio.title}</p>
                          {portfolio.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{portfolio.description}</p>
                          )}
                        </div>
                        {portfolio.media.length === 0 ? (
                          <div className={`h-48 rounded-xl bg-gradient-to-br ${PORTFOLIO_GRADIENTS[pi % PORTFOLIO_GRADIENTS.length]} flex items-center justify-center`}>
                            <Camera className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        ) : (
                          <ImageSlider
                            images={portfolio.media.map((m) => m.mediaUrl)}
                            alt={portfolio.title}
                            className="h-56 rounded-xl border border-border"
                            fallbackGradient={PORTFOLIO_GRADIENTS[pi % PORTFOLIO_GRADIENTS.length]}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* SELLER SHOP — only visible when trader has retail/wholesale specialty */}
            {flags.showShoppingCart && (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Shop Products
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Tap a product to view details and add to cart
                </p>

                {cardData.products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No products listed yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cardData.products.map((product, i) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setSelectedProductIdx(i)}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div
                              className={`h-full w-full bg-gradient-to-br ${PORTFOLIO_GRADIENTS[i % PORTFOLIO_GRADIENTS.length]}`}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-2.5 text-left">
                            <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                              {product.name}
                            </p>
                            {product.price > 0 && (
                              <p className="text-white/90 text-xs font-bold mt-0.5">
                                {product.variants.length > 1 ? "From " : ""}
                                {format(product.price)}
                              </p>
                            )}
                          </div>
                        </button>
                    ))}
                  </div>
                )}

              </section>
            )}

            {/* AVAILABILITY CALENDAR */}
            {flags.showAvailabilityCalendar && (
              <AvailabilityCalendar workingHours={cardData.workDays} confirmedBookings={confirmedBookings} />
            )}

            {/* FAQs */}
            <Section title="Frequently Asked Questions" icon={MessageSquare}>
              {cardData.faqs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No FAQs added yet.</p>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {cardData.faqs.map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={`faq-${faq.id}`}
                      className="border border-border rounded-xl px-4 data-[state=open]:border-primary/50"
                    >
                      <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </Section>

            {/* CALL TO ACTION */}
            {flags.showBookingCTA && (
              <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} border border-border`}>
                <div className="absolute inset-0 bg-background/40" />
                <div className="relative p-6 text-center space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-sm font-medium">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Available for new bookings
                  </div>
                  <h2 className="text-xl font-bold">Ready to work with {cardData.username || cardData.fullName || pro.name}?</h2>
                  <BookNowButton proId={pro.id} className="w-full" disabled={isPreview || viewerIsPro} />
                </div>
              </section>
            )}

          </div>

          {/* ── RIGHT SIDEBAR ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* CONTACT INFORMATION */}
            <Section title="Contact Information" icon={MessageSquare}>
              <div className="space-y-3">
                <SendMessageDialog name={cardData.username || cardData.fullName || pro.name} tradespersonId={pro.id} disabled={isPreview || viewerIsPro} />
                <ShareProfileDialog name={cardData.username || cardData.fullName || pro.name} />
              </div>
            </Section>

            {/* PACKAGES & ADD-ONS */}
            {flags.showPackagesAndAddons && (
            <Section title="Packages & Add-ons" icon={Briefcase}>
              <p className="text-sm text-muted-foreground -mt-3 mb-4">Preview package details or explore custom services</p>
              {cardData.packages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No packages configured yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cardData.packages.map((pkg, i) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPkg(i)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedPkg === i
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {pkg.name}
                      </button>
                    ))}
                  </div>
                  {activePkg && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm uppercase tracking-wide">{activePkg.name}</p>
                        <Badge className="font-mono">${activePkg.price.toFixed(2)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activePkg.description}</p>
                      {activePkg.hours > 0 && (
                        <div>
                          <Badge variant="outline" className="gap-1.5 text-xs">
                            <Clock className="h-3 w-3" />
                            {activePkg.hours} hours
                          </Badge>
                        </div>
                      )}
                      {activePkg.features.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            {activePkg.features.map((f, fi) => (
                              <div key={fi} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {cardData.addons.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="font-semibold text-sm mb-2">Add-ons</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {cardData.addons.map((addon) => (
                                <span key={addon.id}>
                                  {addon.name}{" "}
                                  <span className="text-foreground font-medium">+${addon.price.toFixed(2)}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </Section>
            )}

            {/* WORKING HOURS */}
            <Section title="Working Hours" icon={Clock}>
              {cardData.workDays.every((d) => !d.open) ? (
                <p className="text-sm text-muted-foreground text-center py-2">Working hours not set.</p>
              ) : (
                <div className="space-y-1.5">
                  {cardData.workDays.map(({ day, open, from, to }) => (
                    <div key={day} className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${open ? "bg-muted/30" : "opacity-50"}`}>
                      <span className="font-medium text-sm w-24">{day}</span>
                      {open ? (
                        <span className="text-xs text-muted-foreground">{formatTime(from)} — {formatTime(to)}</span>
                      ) : (
                        <Badge variant="outline" className="text-xs">Closed</Badge>
                      )}
                      {open && (
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* CLIENT REVIEWS */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Client Reviews</h2>
                <AllReviewsDialog
                  reviews={reviews}
                  rating={avgRating}
                  reviewCount={reviewCount}
                  ratingBreakdown={ratingBreakdown}
                  proName={cardData.username || cardData.fullName || pro.name}
                  dbReviews={dbReviews}
                  currentClientId={clientId}
                  onDeleteReview={() => setReviewKey((k) => k + 1)}
                />
              </div>
              {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No reviews yet. Be the first to leave one!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dbReviews.slice(0, 3).map((dbReview, i) => {
                    const review = reviews[i];
                    const isOwner = clientId && dbReview.clientId === clientId;
                    return (
                      <div key={dbReview.id} className="border-l-2 border-primary/40 pl-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                                {review.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-xs">{review.name}</p>
                              <p className="text-xs text-muted-foreground">{review.date}</p>
                            </div>
                          </div>
                          {isOwner && !isPreview && (
                            <DeleteReviewDialog
                              reviewId={dbReview.id}
                              onDeleted={() => setReviewKey((k) => k + 1)}
                            />
                          )}
                        </div>
                        <Stars rating={review.rating} size="sm" />
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{review.text}"</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* STATISTICS */}
            <Section title="Statistics" icon={TrendingUp}>
              <div className="space-y-1">
                {flags.showTotalBookings && (
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">Total Bookings</span>
                    </div>
                    <span className="text-sm font-bold">{reviewCount > 0 ? reviewCount : "—"}</span>
                  </div>
                )}
                <div className={`flex items-center justify-between py-3 border-b border-border`}>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm font-medium">Satisfied Customers</span>
                  </div>
                  <span className="text-sm font-bold">
                    {avgRating > 0 ? Math.round((avgRating / 5) * reviewCount) : reviewCount > 0 ? reviewCount : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">Total Specialties</span>
                  </div>
                  <span className="text-sm font-bold">
                    {cardData.tradeSpecialties.length > 0 ? cardData.tradeSpecialties.length : "—"}
                  </span>
                </div>
              </div>
            </Section>

            {/* CERTIFICATES */}
            <Section title="Certificates & Licenses" icon={Award}>
              {cardData.certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No certifications listed.</p>
              ) : (
                <div className="space-y-2">
                  {cardData.certifications.map((cert) => (
                    <div key={cert.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{cert.name}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </main>

      {/* Product detail popup */}
      {selectedProductIdx !== null && cardData.products[selectedProductIdx] && (
        <ProductDetailDialog
          key={selectedProductIdx}
          product={cardData.products[selectedProductIdx]}
          gradientIndex={selectedProductIdx}
          proId={pro.id}
          traderName={cardData.username || cardData.fullName || pro.name}
          traderInitials={pro.initials}
          onClose={() => setSelectedProductIdx(null)}
          cartDisabled={viewerIsPro}
        />
      )}

      {/* Floating cart button — retail/wholesale traders only, hidden for pro trader viewers */}
      {flags.showShoppingCart && !viewerIsPro && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 shadow-xl hover:bg-primary/90 transition-all hover:scale-105 ${traderItemCount === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          aria-label="View cart"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-bold">{traderItemCount}</span>
          <span className="font-medium hidden sm:inline">View Cart</span>
        </button>
      )}

      {flags.showShoppingCart && !viewerIsPro && <CartSheet open={cartOpen} onOpenChange={setCartOpen} traderId={pro.id} />}

      <SavedSheet open={showLikes} onOpenChange={setShowLikes} />
    </div>
  );
}
