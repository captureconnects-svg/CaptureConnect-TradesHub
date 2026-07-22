import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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
  RotateCcw,
  Paperclip,
  X,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { fetchClientBookings, updateBookingStatus, type BookingRecord } from "@/backend/client-bookings";
import { submitClientReview, deleteClientReview, fetchClientBookingReviews } from "@/backend/client-reviews";
import { fetchClientOrders, type OrderRecord } from "@/backend/client-shopping";
import {
  submitReturnRequest,
  uploadReturnEvidence,
  fetchClientReturnRequests,
  type ReturnRequest,
} from "@/backend/return-requests";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/client-dashboard/bookings")({
  head: () => ({
    meta: [
      { title: "Services — Capture Connect" },
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

const REFUND_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:      { label: "Refund Requested", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  pro_approved: { label: "Pro Approved — Awaiting Admin", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  pro_declined: { label: "Refund Declined by Pro", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  refunded:     { label: "Refunded", color: "bg-green-500/10 text-green-600 border-green-500/20" },
};

function formatTime(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/* ─── Refund Request Dialog ─────────────────────────────────────────────────── */

function RefundRequestDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onSubmit: (reason: string, files: File[]) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    if (submitting) return;
    setReason("");
    setFiles([]);
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your refund request.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(reason.trim(), files);
      setReason("");
      setFiles([]);
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rr-reason">Reason for refund request <span className="text-destructive">*</span></Label>
            <Textarea
              id="rr-reason"
              placeholder="Describe why you are requesting a refund…"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Supporting evidence (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Attach photos, videos, or documents to support your request (images, PDF, video up to 25 MB each).
            </p>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf,video/mp4"
                onChange={(e) => {
                  if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={submitting}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" /> Attach Files
              </Button>
            </div>
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs rounded bg-muted/50 px-3 py-1.5">
                    <span className="flex-1 truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">What happens next?</p>
            <p>1. The pro reviews your request and approves or declines.</p>
            <p>2. If approved, the TradeHub admin team processes the refund within 7 business days.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason.trim()}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Review Dialog ─────────────────────────────────────────────────────────── */

function ReviewDialog({
  open,
  onOpenChange,
  proName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proName: string;
  onSubmit: (rating: number, title: string, description: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    if (submitting) return;
    setRating(0);
    setHoverRating(0);
    setTitle("");
    setDescription("");
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (rating === 0) { toast.error("Please select a star rating."); return; }
    if (!title.trim()) { toast.error("Please add a review title."); return; }
    setSubmitting(true);
    try {
      await onSubmit(rating, title.trim(), description.trim());
      handleClose();
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {proName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Share your experience with this tradesperson.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rating <span className="text-destructive">*</span></Label>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const val = i + 1;
                const filled = val <= (hoverRating || rating);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={submitting}
                    onMouseEnter={() => setHoverRating(val)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(val)}
                    className="focus:outline-none disabled:cursor-not-allowed"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {(hoverRating || rating) > 0 && (
              <p className="text-xs text-muted-foreground">{LABELS[hoverRating || rating]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rv-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="rv-title"
              placeholder="Summarise your experience…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rv-desc">Description (optional)</Label>
            <Textarea
              id="rv-desc"
              placeholder="Tell others more about your experience…"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0 || !title.trim()}>
            {submitting ? "Submitting…" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Booking Card ───────────────────────────────────────────────────────────── */

function BookingCard({
  booking,
  returnRequest,
  onRefundSubmitted,
  existingReviewId,
  onReviewSubmitted,
  onReviewDeleted,
}: {
  booking: Booking;
  returnRequest: ReturnRequest | null;
  onRefundSubmitted: (bookingId: string) => void;
  existingReviewId: number | null;
  onReviewSubmitted: (bookingId: string, reviewId: number) => void;
  onReviewDeleted: (bookingId: string) => void;
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

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

  const canRequestRefund =
    booking.status === "completed" &&
    isPaid &&
    !returnRequest;

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

  async function handleRefundSubmit(reason: string, files: File[]) {
    const requestId = await submitReturnRequest({
      bookingId: booking.id,
      tradespersonId: booking.tradespersonId,
      reason,
    });
    for (const file of files) {
      await uploadReturnEvidence(file, requestId);
    }
    toast.success("Refund request submitted. The pro will review it shortly.");
    onRefundSubmitted(booking.id);
  }

  async function handleReviewSubmit(rating: number, title: string, description: string) {
    const reviewId = await submitClientReview({
      tradespersonId: booking.tradespersonId,
      bookingId: booking.id,
      rating,
      title,
      description,
    });
    toast.success("Review submitted successfully!");
    onReviewSubmitted(booking.id, reviewId);
  }

  async function handleDeleteReview() {
    if (!existingReviewId) return;
    setDeletingReview(true);
    try {
      await deleteClientReview(existingReviewId);
      toast.success("Review deleted.");
      onReviewDeleted(booking.id);
    } catch {
      toast.error("Failed to delete review. Please try again.");
    } finally {
      setDeletingReview(false);
      setDeleteReviewOpen(false);
    }
  }

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

        {/* ── Refund request status ───────────────────────────────────── */}
        {returnRequest && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${REFUND_STATUS_LABEL[returnRequest.status]?.color ?? ""}`}>
              <RotateCcw className="h-3 w-3" />
              {REFUND_STATUS_LABEL[returnRequest.status]?.label ?? returnRequest.status}
              {returnRequest.status === "pro_approved" && returnRequest.refundType && (
                <span className="ml-1 opacity-70">
                  ({returnRequest.refundType === "full" ? "Full refund" : `Partial — $${returnRequest.partialAmount?.toFixed(2) ?? "—"}`})
                </span>
              )}
            </div>
          </div>
        )}

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
            {booking.status === "completed" && !existingReviewId && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setReviewOpen(true)}>
                <Star className="h-3 w-3 mr-1" /> Review
              </Button>
            )}
            {booking.status === "completed" && existingReviewId && (
              <>
                <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reviewed
                </span>
                <AlertDialog open={deleteReviewOpen} onOpenChange={setDeleteReviewOpen}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your review?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove your review of {booking.pro}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Review</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteReview}
                        disabled={deletingReview}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingReview ? "Deleting…" : "Yes, Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {canRequestRefund && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
                onClick={() => setRefundOpen(true)}
              >
                <RotateCcw className="h-3 w-3" /> Request Refund
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <RefundRequestDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Request a Refund — Completed Booking"
        description={`Submit a refund request for your booking with ${booking.pro}. The pro must approve before the admin issues the refund.`}
        onSubmit={handleRefundSubmit}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        proName={booking.pro}
        onSubmit={handleReviewSubmit}
      />
    </Card>
  );
}

/* ─── Order Card ─────────────────────────────────────────────────────────────── */

function OrderCard({
  order,
  returnRequest,
  onRefundSubmitted,
}: {
  order: OrderRecord;
  returnRequest: ReturnRequest | null;
  onRefundSubmitted: (orderId: number) => void;
}) {
  const { format } = useCurrency();
  const [refundOpen, setRefundOpen] = useState(false);

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isDelivery = order.shippingMethod === "delivery";

  const daysSinceOrder = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysLeftForReturn = Math.max(0, 14 - daysSinceOrder);
  const returnEligible = daysLeftForReturn > 0;
  const canRequestReturn = returnEligible && !returnRequest;

  async function handleReturnSubmit(reason: string, files: File[]) {
    const tradespersonId = order.tradespersonId ?? "";
    const requestId = await submitReturnRequest({
      orderId: order.id,
      tradespersonId,
      reason,
    });
    for (const file of files) {
      await uploadReturnEvidence(file, requestId);
    }
    toast.success("Return request submitted. The pro will review it shortly.");
    onRefundSubmitted(order.id);
  }

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
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Badge variant="outline" className="flex items-center gap-1">
              {isDelivery ? (
                <><Truck className="h-3 w-3" /> Delivery</>
              ) : (
                <><Package className="h-3 w-3" /> Pickup</>
              )}
            </Badge>
            {returnRequest ? (
              <Badge className={`flex items-center gap-1 border text-xs ${REFUND_STATUS_LABEL[returnRequest.status]?.color ?? ""}`}>
                <RotateCcw className="h-3 w-3" />
                {REFUND_STATUS_LABEL[returnRequest.status]?.label ?? returnRequest.status}
              </Badge>
            ) : returnEligible ? (
              <Badge className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                <RotateCcw className="h-3 w-3" />
                {daysLeftForReturn}d left to return
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground/60 flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                Return closed
              </Badge>
            )}
          </div>
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

        {/* ── Return footer ───────────────────────────────────────────── */}
        {returnRequest?.status === "pro_approved" && returnRequest.refundType && (
          <div className="mt-3 pt-3 border-t border-border rounded-lg bg-blue-500/5 border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pro approved your return
            </p>
            <p className="mt-1 text-muted-foreground">
              Refund type: <span className="font-medium text-foreground">
                {returnRequest.refundType === "full"
                  ? "Full refund"
                  : `Partial — ${format(returnRequest.partialAmount ?? 0)}`}
              </span>. The admin team will process this within 7 business days.
            </p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {returnEligible && !returnRequest
              ? `Return window closes in ${daysLeftForReturn} day${daysLeftForReturn !== 1 ? "s" : ""}`
              : returnRequest
              ? "Return request submitted"
              : "Return window has closed for this order"}
          </p>
          {canRequestReturn && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1.5"
              onClick={() => setRefundOpen(true)}
            >
              <RotateCcw className="h-3 w-3" /> Request Return
            </Button>
          )}
        </div>
      </CardContent>

      <RefundRequestDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Request a Return & Refund"
        description={`Submit a return request for Order #${String(order.id).padStart(6, "0")}. The seller must approve before the admin issues your refund.`}
        onSubmit={handleReturnSubmit}
      />
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
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [reviewsByBooking, setReviewsByBooking] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchClientBookings(), fetchClientOrders(), fetchClientReturnRequests()])
      .then(([b, o, rr]) => {
        setBookings(b);
        setOrders(o);
        setReturnRequests(rr);
        const completedIds = b.filter((bk) => bk.status === "completed").map((bk) => bk.id);
        if (completedIds.length > 0) {
          fetchClientBookingReviews(completedIds).then(setReviewsByBooking).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter((b) => b.date >= today);
  const past = bookings.filter((b) => b.date < today);

  const rrByBooking = Object.fromEntries(
    returnRequests.filter((r) => r.bookingId).map((r) => [r.bookingId!, r])
  );
  const rrByOrder = Object.fromEntries(
    returnRequests.filter((r) => r.orderId).map((r) => [r.orderId!, r])
  );

  function addBookingRR(_bookingId: string) {
    fetchClientReturnRequests().then(setReturnRequests).catch(() => {});
  }

  function addOrderRR(_orderId: number) {
    fetchClientReturnRequests().then(setReturnRequests).catch(() => {});
  }

  function handleReviewSubmitted(bookingId: string, reviewId: number) {
    setReviewsByBooking((prev) => ({ ...prev, [bookingId]: reviewId }));
  }

  function handleReviewDeleted(bookingId: string) {
    setReviewsByBooking((prev) => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  }

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
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="w-max sm:w-auto">
                <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                <TabsTrigger value="past">Past Bookings ({past.length})</TabsTrigger>
                <TabsTrigger value="purchases">
                  Past Purchases {orders.length > 0 && `(${orders.length})`}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">
                  No upcoming bookings.
                </p>
              ) : (
                upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    returnRequest={rrByBooking[b.id] ?? null}
                    onRefundSubmitted={addBookingRR}
                    existingReviewId={reviewsByBooking[b.id] ?? null}
                    onReviewSubmitted={handleReviewSubmitted}
                    onReviewDeleted={handleReviewDeleted}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-4 space-y-3">
              {past.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">
                  No past bookings.
                </p>
              ) : (
                past.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    returnRequest={rrByBooking[b.id] ?? null}
                    onRefundSubmitted={addBookingRR}
                    existingReviewId={reviewsByBooking[b.id] ?? null}
                    onReviewSubmitted={handleReviewSubmitted}
                    onReviewDeleted={handleReviewDeleted}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="purchases" className="mt-4 space-y-3">
              {orders.length === 0 ? (
                <PurchasesEmptyState />
              ) : (
                orders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    returnRequest={rrByOrder[o.id] ?? null}
                    onRefundSubmitted={addOrderRR}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
