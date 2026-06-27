import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { getProProfile } from "@/backend/pro-profile";
import { getSpecialtyFeatureFlags } from "@/backend/pro-specialty-features";
import { fetchProProfileData, updateProProfileData, uploadProProfileImage, deleteProProfileImage,
  ensureProProfileExists,
  type EditProfileData,
  type DiscountCode,
  type WorkDay,
  type ServicePackage,
  type TradeAddon,
  type Faq,
} from "@/backend/pro-edit-profile";
import { fetchMerchandise, addMerchandiseItem, updateMerchandiseItem, deleteMerchandiseItem, addVariant, updateVariant, deleteVariant, uploadMerchandiseImage, saveMerchandiseImageUrl, deleteMerchandiseImageUrl, type MerchandiseItem, type MerchandiseVariant, type MerchandiseItemWithVariants, type MerchandiseImage } from "@/backend/pro-merchandise";
import { fetchMyDeliveryFee, saveDeliveryFee } from "@/backend/delivery-fee";
import { fetchProOrders, updateOrderFulfillment, type ProOrderRecord } from "@/backend/client-shopping";
import { fetchMyReviews, type ClientReview } from "@/backend/client-reviews";
import { fetchProStats, type ProStats } from "@/backend/pro-stats";
import { fetchPortfolios, createPortfolio, updatePortfolio, uploadPortfolioMedia, savePortfolioMediaUrl, deletePortfolioMedia, deletePortfolio, MAX_MEDIA_PER_PORTFOLIO, type Portfolio, type PortfolioMedia } from "@/backend/pro-portfolio";
import { fetchProBookings, updateBookingStatus, rescheduleBooking, markBookingPaid, type ProBookingRecord } from "@/backend/client-bookings";
import { fetchProActivity, fetchProActivityStats, type ActivityRecord } from "@/backend/pro-activity";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  sendMessageWithAttachments,
  type Conversation,
  type ConversationMessage,
} from "@/backend/conversations";
import { toast } from "sonner";
import { getVerificationStatus } from "@/backend/pro-verification";
import { changePassword, deleteAccount } from "@/backend/account-settings";
import { switchToClientAccount } from "@/backend/switch-account";
import { fetchMyTestimonials, uploadTestimonialVideo, submitTestimonial, deleteTestimonial, type VideoTestimonialRecord } from "@/backend/testimonials";
import { Hammer, LayoutDashboard, Upload, UserCog, MessageSquare, Settings, CalendarCheck, Calendar, Wallet, Activity, Eye, LogOut, Bell, Star, DollarSign, Briefcase, Heart, ImagePlus, Send, ArrowUpRight, ArrowDownRight, Info, X, RefreshCw, FileText, ArrowDownCircle, Search, Filter, Lock, Trash2, BarChart2, Users, ShoppingBag, Plus, Tag, Package, Film, FolderOpen, Pencil, Clock, MapPin, Phone, Mail, Check, Truck, ArrowLeft, ClipboardList, Paperclip, AlertTriangle, CheckCircle2, } from "lucide-react";
import { fetchProReturnRequests, approveReturnRequest, declineReturnRequest, fetchReturnEvidence, type ReturnRequest } from "@/backend/return-requests";
import { CATEGORIES, slugifyName } from "@/lib/trades-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/lib/theme";
import { CurrencySelect, useCurrency } from "@/lib/currency";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter, } from "@/components/ui/sidebar";

export const Route = createFileRoute("/pro-dashboard")({
  head: () => ({
    meta: [
      { title: "Pro Dashboard — Capture Connect" },
      {
        name: "description",
        content:
          "Manage your trade business — bookings, messages, payments, and your public profile.",
      },
    ],
  }),
  component: ProDashboardPage,
});

type View =
  | "overview"
  | "profile"
  | "messages"
  | "bookings"
  | "payments"
  | "activity"
  | "settings"
  | "merchandise"
  | "portfolio"
  | "testimonials";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Edit Profile", icon: UserCog },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "bookings", label: "Manage Bookings", icon: CalendarCheck },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "activity", label: "All Activity", icon: Activity },
  { id: "portfolio", label: "Upload Work", icon: Upload },
  { id: "merchandise", label: "Shop Merchandise", icon: ShoppingBag },
  { id: "testimonials", label: "Testimonials", icon: Film },
  { id: "settings", label: "Settings", icon: Settings },
];

function ProDashboardPage() {
  const [view, setView] = useState<View>("overview");
  const [userName, setUserName] = useState<string>("");
  const [proId, setProId] = useState<string>("");
  const [proSlug, setProSlug] = useState<string>("");
  const [tradeSpecialties, setTradeSpecialties] = useState<string[]>([]);
  const [verificationReady, setVerificationReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getVerificationStatus().then(({ status }) => {
      if (status === "none") {
        navigate({ to: "/pro-verification" });
        return;
      }
      if (status !== "approved") {
        toast.warning(
          "Your account is pending verification. You cannot access the pro section until your identity is verified."
        );
        navigate({ to: "/" });
        return;
      }
      setVerificationReady(true);
      ensureProProfileExists();
      getProProfile().then((profile) => {
        if (profile) {
          setUserName(profile.displayName);
          setProId(profile.id);
        }
      });
      fetchProProfileData().then((data) => {
        if (data) {
          setTradeSpecialties(data.tradeSpecialties ?? []);
          const dbName = data.username || data.fullName;
          if (dbName) setUserName(dbName);
          setProSlug(data.username || slugifyName(data.fullName ?? ""));
        }
      });
    });
  }, []);

  const { showMerchandise, showBookings, showPortfolio } = getSpecialtyFeatureFlags(tradeSpecialties);
  const retailOnly = showMerchandise && !showBookings;
  const retailMixed = showMerchandise && showBookings;

  useEffect(() => {
    if (view === "merchandise" && !showMerchandise) setView("overview");
    if (view === "bookings" && !showBookings) setView("overview");
    if (view === "portfolio" && !showPortfolio) setView("overview");
  }, [showMerchandise, showBookings, showPortfolio, view]);

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  if (!verificationReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Hammer className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Checking verification status…</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/" className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                <Hammer className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
                Capture Connect Pro
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.filter((item) => {
                    if (item.id === "merchandise") return showMerchandise;
                    if (item.id === "bookings") return showBookings;
                    if (item.id === "portfolio") return showPortfolio;
                    return true;
                  }).map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={view === item.id}
                        onClick={() => setView(item.id)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate({ to: "/pro-login-signup", search: { mode: "login" } })} tooltip="Log out">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-base font-semibold">
                {NAV.find((n) => n.id === view)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <CurrencySelect className="hidden sm:flex" />
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!proId}
                onClick={() => proId && window.open(`/client-dashboard/trader/${proSlug || proId}?preview=true`, "_blank")}
              >
                <Eye className="h-4 w-4" /> <span className="hidden sm:inline">View Public Profile</span>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
            {view === "overview" && <Overview userName={userName} proId={proId} retailOnly={retailOnly} retailMixed={retailMixed} />}
            {view === "profile" && <EditProfile showPackagesAndAddons={getSpecialtyFeatureFlags(tradeSpecialties).showPackagesAndAddons} />}
            {view === "messages" && <Messages />}
            {view === "bookings" && <Bookings />}
            {view === "payments" && <Payments />}
            {view === "activity" && <AllActivity />}
            {view === "portfolio" && <UploadWork tradeSpecialties={tradeSpecialties} />}
            {view === "merchandise" && <Merchandise />}
            {view === "testimonials" && <Testimonials proName={userName} />}
            {view === "settings" && <SettingsView />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

/* ---------- Activity helpers ---------- */

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: typeof Eye; label: string; iconColor: string; iconBg: string }> = {
  view:    { icon: Eye,           label: "Profile View", iconColor: "text-blue-500",    iconBg: "bg-blue-500/10" },
  like:    { icon: Heart,         label: "Like",         iconColor: "text-pink-500",    iconBg: "bg-pink-500/10" },
  review:  { icon: Star,          label: "Review",       iconColor: "text-amber-400",   iconBg: "bg-amber-400/10" },
  message: { icon: MessageSquare, label: "Message",      iconColor: "text-blue-400",    iconBg: "bg-blue-400/10" },
  booking: { icon: CalendarCheck, label: "Booking",      iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
  payment: { icon: DollarSign,    label: "Payment",      iconColor: "text-primary",     iconBg: "bg-primary/10" },
  order:          { icon: ShoppingBag,   label: "Shop Order",      iconColor: "text-violet-500",  iconBg: "bg-violet-500/10" },
  refund_request: { icon: RefreshCw,     label: "Refund Request",  iconColor: "text-amber-500",   iconBg: "bg-amber-500/10" },
};

function activityDisplayType(activityType: string): string {
  return activityType === "profile_view" ? "view" : activityType;
}

function formatActivityRecord(a: ActivityRecord) {
  const d = new Date(a.createdAt);
  return {
    id: a.id,
    type: activityDisplayType(a.activityType),
    text: a.description,
    date: d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    month: d.toLocaleDateString(undefined, { month: "short" }),
    _ts: d.getTime(),
  };
}

/* ---------- Sections ---------- */

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  positive = true,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {delta !== undefined && (
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              positive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Overview({
  userName,
  proId,
  retailOnly,
  retailMixed,
}: {
  userName: string;
  proId: string;
  retailOnly: boolean;
  retailMixed: boolean;
}) {
  const { format } = useCurrency();
  const [stats, setStats] = useState<ProStats>({
    earningsThirtyDays: 0,
    jobsCompleted: 0,
    portfolioCount: 0,
    pendingRequests: 0,
    totalReviews: 0,
    totalLikes: 0,
    totalProfileViews: 0,
    newOrders: 0,
    totalMerchandise: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<ProBookingRecord[]>([]);
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ActivityRecord[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [recentOrders, setRecentOrders] = useState<ProOrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    fetchProStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false));

    fetchProBookings()
      .then((all) => {
        const today = new Date().toISOString().split("T")[0];
        const upcoming = all
          .filter((b) => b.status === "confirmed" && b.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 2);
        setUpcomingBookings(upcoming);
      })
      .catch(() => {})
      .finally(() => setLoadingBookings(false));

    fetchMyReviews(3)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoadingReviews(false));

    fetchProActivity(3)
      .then(setRecentActivities)
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, []);

  useEffect(() => {
    if (!(retailOnly || retailMixed)) return;
    setLoadingOrders(true);
    fetchProOrders()
      .then((all) => setRecentOrders(all.filter((o) => !o.isDelivered).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [retailOnly, retailMixed]);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h2 className="text-2xl sm:text-3xl font-bold mt-1">{userName || "Welcome"}</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          {loadingStats ? (
            "Loading your dashboard…"
          ) : retailOnly ? (
            stats.newOrders > 0 ? (
              <>
                You have{" "}
                <span className="text-primary font-semibold">
                  {stats.newOrders} new {stats.newOrders === 1 ? "order" : "orders"}
                </span>
                {" "}awaiting fulfillment. Ship or prepare them to keep your customers happy.
              </>
            ) : (
              "No new orders right now. Your shop is ready for customers."
            )
          ) : stats.pendingRequests > 0 ? (
            <>
              You have{" "}
              <span className="text-primary font-semibold">
                {stats.pendingRequests} pending {stats.pendingRequests === 1 ? "request" : "requests"}
              </span>
              . Keep momentum going — pros who reply within an hour book 2× more jobs.
            </>
          ) : (
            "No pending requests right now. Keep momentum going — pros who reply within an hour book 2× more jobs."
          )}
        </p>
      </div>

      {/* Stats */}
      {retailOnly ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            icon={ShoppingBag}
            label="New Orders"
            value={loadingStats ? "—" : String(stats.newOrders)}
          />
          <StatCard
            icon={Package}
            label="Total Merchandise"
            value={loadingStats ? "—" : String(stats.totalMerchandise)}
          />
          <StatCard
            icon={Star}
            label="Total Reviews"
            value={loadingStats ? "—" : String(stats.totalReviews)}
          />
          <StatCard
            icon={Heart}
            label="Total Likes"
            value={loadingStats ? "—" : String(stats.totalLikes)}
          />
          <StatCard
            icon={Eye}
            label="Profile Views"
            value={loadingStats ? "—" : String(stats.totalProfileViews)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Star}
            label="Total Reviews"
            value={loadingStats ? "—" : String(stats.totalReviews)}
          />
          <StatCard
            icon={Heart}
            label="Total Likes"
            value={loadingStats ? "—" : String(stats.totalLikes)}
          />
          <StatCard
            icon={Eye}
            label="Profile Views"
            value={loadingStats ? "—" : String(stats.totalProfileViews)}
          />
          <StatCard
            icon={Clock}
            label="Pending Requests"
            value={loadingStats ? "—" : String(stats.pendingRequests)}
          />
        </div>
      )}
      {retailMixed && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={ShoppingBag}
            label="New Shop Orders"
            value={loadingStats ? "—" : String(stats.newOrders)}
          />
          <StatCard
            icon={Package}
            label="Total Merchandise"
            value={loadingStats ? "—" : String(stats.totalMerchandise)}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {retailOnly ? (
          /* ── New Orders (retail-only) ──────────────────────────── */
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col min-h-[280px]">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">New Orders</h2>
            </div>
            {loadingOrders ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <ShoppingBag className="h-14 w-14 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-base">No new orders</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  New customer orders will appear here once placed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{o.clientName || "Client"}</p>
                      <Badge
                        variant={o.shippingMethod === "delivery" ? "default" : "secondary"}
                        className="text-xs gap-1"
                      >
                        {o.shippingMethod === "delivery" ? (
                          <><Truck className="h-3 w-3" /> Delivery</>
                        ) : (
                          <><Package className="h-3 w-3" /> Pickup</>
                        )}
                      </Badge>
                    </div>
                    {o.items.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {o.items.map((i) => i.serviceName).join(", ")}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-semibold">{format(o.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Upcoming Bookings (non-retail / mixed) ────────────── */
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col min-h-[280px]">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Upcoming Bookings</h2>
            </div>
            {loadingBookings ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <Calendar className="h-14 w-14 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-base">No upcoming bookings</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Confirmed bookings will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{b.clientName}</p>
                      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 text-xs">
                        Confirmed
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{b.service}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(b.date + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {b.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {b.time}
                        </span>
                      )}
                      {b.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {b.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Reviews */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-amber-400" />
            <h2 className="font-semibold">Recent Reviews</h2>
          </div>
          {loadingReviews ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Star className="h-14 w-14 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-base">No reviews yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Client reviews will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-sm">{review.clientName}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-4 w-4 ${
                            j < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.title && (
                    <p className="text-sm font-medium mb-1">{review.title}</p>
                  )}
                  {review.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      "{review.description}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {new Date(review.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Activity</h2>
            <button
              onClick={() => {/* handled by parent via setView */}}
              className="text-xs text-primary hover:underline"
            >
            </button>
          </div>
          {loadingActivity ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>
          ) : recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No activity in the last 30 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((a) => {
                const item = formatActivityRecord(a);
                const cfg = ACTIVITY_TYPE_CONFIG[item.type] ?? ACTIVITY_TYPE_CONFIG["view"];
                return (
                  <div key={a.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                      <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.date} at {item.time}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs whitespace-nowrap">{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;


function EditProfile({ showPackagesAndAddons }: { showPackagesAndAddons: boolean }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [bio, setBio] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [profileVisibility, setProfileVisibility] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [activeRole, setActiveRole] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [tradeSpecialty, setTradeSpecialty] = useState("");
  const [tradeSpecialties, setTradeSpecialties] = useState<string[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [newPkg, setNewPkg] = useState<Omit<ServicePackage, "id">>({ name: "", price: "", duration: 0, description: "", features: "" });
  const [addons, setAddons] = useState<TradeAddon[]>([]);
  const [newAddon, setNewAddon] = useState<Omit<TradeAddon, "id">>({ name: "", price: "" });
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [newFaq, setNewFaq] = useState<Omit<Faq, "id">>({ question: "", answer: "" });
  const [weekSchedule, setWeekSchedule] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, { start: "", end: "" }]))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // Reset so the same file can be re-selected after removal
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveMsg({ type: "error", text: "Image must be under 5 MB." });
      return;
    }

    setImageUploading(true);
    setSaveMsg(null);
    try {
      if (profileImage) await deleteProProfileImage(profileImage);
      const url = await uploadProProfileImage(file);
      setProfileImage(url);
      // Persist the new URL immediately so a page refresh keeps the image
      await updateProProfileData({
        fullName, username, dob, gender, email, location, yearsExp,
        bio, certifications, tradeSpecialties,
        workDays: DAYS_OF_WEEK
          .filter((d) => weekSchedule[d].start && weekSchedule[d].end)
          .map((d, i) => ({ id: i + 1, workday: d, startTime: weekSchedule[d].start, endTime: weekSchedule[d].end })),
        discountCodes, packages, addons, faqs,
        profileVisibility, responseTime, activeRole, profileImage: url, tradeSpecialty,
      });
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setImageUploading(false);
    }
  }

  async function handleRemoveImage() {
    if (!profileImage) return;
    setImageUploading(true);
    setSaveMsg(null);
    try {
      await deleteProProfileImage(profileImage);
      setProfileImage("");
      await updateProProfileData({
        fullName, username, dob, gender, email, location, yearsExp,
        bio, certifications, tradeSpecialties,
        workDays: DAYS_OF_WEEK
          .filter((d) => weekSchedule[d].start && weekSchedule[d].end)
          .map((d, i) => ({ id: i + 1, workday: d, startTime: weekSchedule[d].start, endTime: weekSchedule[d].end })),
        discountCodes, packages, addons, faqs,
        profileVisibility, responseTime, activeRole, profileImage: "", tradeSpecialty,
      });
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Remove failed." });
    } finally {
      setImageUploading(false);
    }
  }

  useEffect(() => {
    fetchProProfileData().then((data) => {
      if (data) {
        setFullName(data.fullName);
        setUsername(data.username);
        setDob(data.dob);
        setGender(data.gender);
        setEmail(data.email);
        setLocation(data.location);
        setYearsExp(data.yearsExp);
        setBio(data.bio);
        setCertifications(data.certifications);
        setWorkDays(data.workDays);
        const sched: Record<string, { start: string; end: string }> =
          Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, { start: "", end: "" }]));
        (data.workDays ?? []).forEach((wd) => {
          if ((DAYS_OF_WEEK as readonly string[]).includes(wd.workday)) {
            sched[wd.workday] = { start: wd.startTime, end: wd.endTime };
          }
        });
        setWeekSchedule(sched);
        setProfileVisibility(data.profileVisibility);
        setResponseTime(data.responseTime);
        setActiveRole(data.activeRole);
        setProfileImage(data.profileImage);
        setTradeSpecialty(data.tradeSpecialty);
        setTradeSpecialties(data.tradeSpecialties);
        setDiscountCodes(data.discountCodes);
        setPackages(data.packages);
        setAddons(data.addons);
        setFaqs(data.faqs);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const workDaysFromSchedule: WorkDay[] = DAYS_OF_WEEK
        .filter((d) => weekSchedule[d].start && weekSchedule[d].end)
        .map((d, i) => ({ id: i + 1, workday: d, startTime: weekSchedule[d].start, endTime: weekSchedule[d].end }));
      const profileData: EditProfileData = {
        fullName, username, dob, gender, email, location, yearsExp,
        bio, certifications, tradeSpecialties, workDays: workDaysFromSchedule, discountCodes,
        packages, addons, faqs,
        profileVisibility, responseTime, activeRole, profileImage, tradeSpecialty,
      };
      await updateProProfileData(profileData);
      setSaveMsg({ type: "success", text: "Profile saved successfully." });
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Save / View */}
      <div className="flex items-center justify-end gap-3">
        {saveMsg && (
          <p className={`text-sm ${saveMsg.type === "success" ? "text-emerald-500" : "text-destructive"}`}>
            {saveMsg.text}
          </p>
        )}
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          <Eye className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Profile Photo + Professional Details | Basic Information */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Profile Photo</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {profileImage && <AvatarImage src={profileImage} alt="Profile photo" className="object-cover" />}
                <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                  {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={imageUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {imageUploading ? "Uploading…" : "Upload New Photo"}
                  </Button>
                  {profileImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      disabled={imageUploading}
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG or PNG, max 5 MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Professional Details</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 14 years" />
              </div>
              {/* Certifications */}
              <div className="space-y-2">
                <Label>Certifications</Label>
                <div className="space-y-2">
                  {certifications.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={c}
                        onChange={(e) => setCertifications((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost" onClick={() => setCertifications((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCertifications((prev) => [...prev, ""])}>
                    + Add Certification
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Basic Information</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Discount Codes + Working Hours */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Discount Codes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Discount Codes</h3>
          <div className="space-y-4">
            {discountCodes.map((dc) => (
              <div key={dc.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Discount Code</p>
                  <button
                    onClick={() => setDiscountCodes((prev) => prev.filter((d) => d.id !== dc.id))}
                    className="text-destructive hover:opacity-70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={dc.code}
                      className="h-8 text-sm"
                      onChange={(e) =>
                        setDiscountCodes((prev) =>
                          prev.map((d) => (d.id === dc.id ? { ...d, code: e.target.value } : d))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Discount %</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      <Input
                        value={dc.discount}
                        className="h-8 text-sm pl-6"
                        onChange={(e) =>
                          setDiscountCodes((prev) =>
                            prev.map((d) => (d.id === dc.id ? { ...d, discount: Number(e.target.value) } : d))
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valid From</Label>
                    <Input
                      type="date"
                      value={dc.validFrom}
                      className="h-8 text-sm"
                      onChange={(e) =>
                        setDiscountCodes((prev) =>
                          prev.map((d) => (d.id === dc.id ? { ...d, validFrom: e.target.value } : d))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valid Until</Label>
                    <Input
                      type="date"
                      value={dc.validUntil}
                      className="h-8 text-sm"
                      onChange={(e) =>
                        setDiscountCodes((prev) =>
                          prev.map((d) => (d.id === dc.id ? { ...d, validUntil: e.target.value } : d))
                        )
                      }
                    />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <Label className="text-xs">Max Uses (optional)</Label>
                    <Input
                      value={dc.maxUses}
                      className="h-8 text-sm w-24"
                      onChange={(e) =>
                        setDiscountCodes((prev) =>
                          prev.map((d) => (d.id === dc.id ? { ...d, maxUses: e.target.value } : d))
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-0.5">
                    <Switch
                      checked={dc.active}
                      onCheckedChange={(checked) =>
                        setDiscountCodes((prev) =>
                          prev.map((d) => (d.id === dc.id ? { ...d, active: checked } : d))
                        )
                      }
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDiscountCodes((prev) => [
                  ...prev,
                  { id: Date.now(), code: "", discount: 0, validFrom: "", validUntil: "", maxUses: "", active: true },
                ])
              }
            >
              + Add Discount Code
            </Button>
          </div>
        </div>

        {/* Work Days */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Work Days</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Set your hours for each day. Leave a day blank to mark it as closed.
          </p>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const hours = weekSchedule[day];
              const isClosed = !hours.start && !hours.end;
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium shrink-0">{day}</span>
                  <Input
                    type="time"
                    value={hours.start}
                    onChange={(e) =>
                      setWeekSchedule((prev) => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))
                    }
                    className="h-8 text-sm w-32"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">to</span>
                  <Input
                    type="time"
                    value={hours.end}
                    onChange={(e) =>
                      setWeekSchedule((prev) => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))
                    }
                    className="h-8 text-sm w-32"
                  />
                  {isClosed ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Closed</Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWeekSchedule((prev) => ({ ...prev, [day]: { start: "", end: "" } }))}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Clear ${day}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bio & Specialties */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Bio & Specialties</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Professional Bio</Label>
            <Textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your trade experience, qualifications, and what makes you stand out…"
            />
          </div>


          <div>
            <Label className="mb-3 block">Trade Specialties</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => (
                <label key={cat.slug} className="flex items-center gap-2 cursor-pointer text-sm select-none">
                  <input
                    type="checkbox"
                    checked={tradeSpecialties.includes(cat.name)}
                    onChange={() =>
                      setTradeSpecialties((prev) =>
                        prev.includes(cat.name) ? prev.filter((x) => x !== cat.name) : [...prev, cat.name]
                      )
                    }
                    className="h-4 w-4 accent-primary rounded"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPackagesAndAddons && (
        <>
          {/* Packages */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Packages</h3>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="font-medium text-sm">Add New Package</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Package name"
                    value={newPkg.name}
                    onChange={(e) => setNewPkg((p) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Price (e.g. $500)"
                    value={newPkg.price}
                    onChange={(e) => setNewPkg((p) => ({ ...p, price: e.target.value }))}
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  value={newPkg.duration}
                  onChange={(e) => setNewPkg((p) => ({ ...p, duration: Number(e.target.value) }))}
                  placeholder="Duration (hours)"
                />
                <Textarea
                  placeholder="Description"
                  rows={3}
                  value={newPkg.description}
                  onChange={(e) => setNewPkg((p) => ({ ...p, description: e.target.value }))}
                />
                <Textarea
                  placeholder="Features (one per line)"
                  rows={3}
                  value={newPkg.features}
                  onChange={(e) => setNewPkg((p) => ({ ...p, features: e.target.value }))}
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!newPkg.name || !newPkg.price) return;
                    setPackages((prev) => [...prev, { ...newPkg, id: Date.now() }]);
                    setNewPkg({ name: "", price: "", duration: 0, description: "", features: "" });
                  }}
                >
                  Add Package
                </Button>
              </div>
              <div className="space-y-4">
                <p className="font-medium text-sm">Recorded Packages</p>
                {packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{pkg.name}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => setPackages((prev) => prev.filter((p) => p.id !== pkg.id))}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={pkg.name} className="h-8 text-sm" onChange={(e) => setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, name: e.target.value } : p))} />
                      <Input value={pkg.price} className="h-8 text-sm" onChange={(e) => setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, price: e.target.value } : p))} />
                    </div>
                    <p className="text-xs text-muted-foreground">Duration: {pkg.duration} {pkg.duration === 1 ? "hour" : "hours"}</p>
                    <Textarea value={pkg.description} placeholder="Description" rows={2} className="text-sm" onChange={(e) => setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, description: e.target.value } : p))} />
                    <Textarea value={pkg.features} placeholder="Features (one per line)" rows={2} className="text-sm" onChange={(e) => setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, features: e.target.value } : p))} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add-ons */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Add-ons</h3>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="font-medium text-sm">Add New Add-on</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Add-on name"
                    value={newAddon.name}
                    onChange={(e) => setNewAddon((a) => ({ ...a, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Price (e.g. +$100)"
                    value={newAddon.price}
                    onChange={(e) => setNewAddon((a) => ({ ...a, price: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!newAddon.name || !newAddon.price) return;
                    setAddons((prev) => [...prev, { ...newAddon, id: Date.now() }]);
                    setNewAddon({ name: "", price: "" });
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="space-y-4">
                <p className="font-medium text-sm">Recorded Add-ons</p>
                {addons.map((addon) => (
                  <div key={addon.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{addon.name}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => setAddons((prev) => prev.filter((a) => a.id !== addon.id))}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={addon.name} className="h-8 text-sm" onChange={(e) => setAddons((prev) => prev.map((a) => a.id === addon.id ? { ...a, name: e.target.value } : a))} />
                      <Input value={addon.price} className="h-8 text-sm" onChange={(e) => setAddons((prev) => prev.map((a) => a.id === addon.id ? { ...a, price: e.target.value } : a))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* FAQs */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="font-medium text-sm">Add New FAQ</p>
            <Input
              placeholder="Question"
              value={newFaq.question}
              onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
            />
            <Textarea
              placeholder="Answer"
              rows={4}
              value={newFaq.answer}
              onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
            />
            <Button
              className="w-full"
              onClick={() => {
                if (!newFaq.question || !newFaq.answer) return;
                setFaqs((prev) => [...prev, { ...newFaq, id: Date.now() }]);
                setNewFaq({ question: "", answer: "" });
              }}
            >
              Add FAQ
            </Button>
          </div>
          <div className="space-y-4">
            <p className="font-medium text-sm">Recorded FAQs</p>
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{faq.question}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => setFaqs((prev) => prev.filter((f) => f.id !== faq.id))}>
                      Delete
                    </Button>
                  </div>
                </div>
                <Input value={faq.question} className="h-8 text-sm" onChange={(e) => setFaqs((prev) => prev.map((f) => f.id === faq.id ? { ...f, question: e.target.value } : f))} />
                <Textarea value={faq.answer} rows={3} className="text-sm" onChange={(e) => setFaqs((prev) => prev.map((f) => f.id === faq.id ? { ...f, answer: e.target.value } : f))} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function relTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function msgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
}

function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations()
      .then((convos) => {
        setConversations(convos);
        if (convos.length > 0) setActiveConvoId(convos[0].id);
      })
      .catch(() => toast.error("Failed to load conversations."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeConvoId === null) return;
    setMsgLoading(true);
    fetchMessages(activeConvoId)
      .then(setMessages)
      .catch(() => toast.error("Failed to load messages."))
      .finally(() => setMsgLoading(false));
  }, [activeConvoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConvo = conversations.find((c) => c.id === activeConvoId) ?? null;

  async function handleSend() {
    if ((!input.trim() && files.length === 0) || activeConvoId === null || sending) return;
    setSending(true);
    try {
      const msgs = await sendMessageWithAttachments({
        convoId: activeConvoId,
        content: input.trim(),
        files,
      });
      setMessages((prev) => [...prev, ...msgs]);
      const last = msgs[msgs.length - 1];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvoId
            ? { ...c, lastMessage: { content: last.content, createdAt: last.createdAt }, lastMsgAt: last.createdAt }
            : c
        )
      );
      setInput("");
      setFiles([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading conversations…
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-160px)] min-h-[500px]">
      <div className="rounded-xl border border-border bg-card overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveConvoId(c.id)}
            className={`w-full text-left p-4 border-b border-border hover:bg-muted/40 transition-colors ${
              activeConvoId === c.id ? "bg-muted/40" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.otherPartyName}</span>
              {c.lastMsgAt && (
                <span className="text-xs text-muted-foreground">{relTime(c.lastMsgAt)}</span>
              )}
            </div>
            {c.lastMessage && (
              <p className="text-sm text-muted-foreground truncate mt-1">{c.lastMessage.content}</p>
            )}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card flex flex-col">
        {activeConvo && (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {activeConvo.otherPartyImage && (
                  <AvatarImage src={activeConvo.otherPartyImage} alt={activeConvo.otherPartyName} />
                )}
                <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                  {activeConvo.otherPartyName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold flex-1">{activeConvo.otherPartyName}</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setActiveConvoId(null)}
                title="Close chat"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {msgLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <Bubble key={m.id} who={m.isOwn ? "me" : "them"} time={msgTime(m.createdAt)}>
                    {m.content && <span>{m.content}</span>}
                    {m.fileUrl && (
                      isImageUrl(m.fileUrl) ? (
                        <img
                          src={m.fileUrl}
                          alt="attachment"
                          className="max-w-[220px] rounded-lg mt-1 block"
                        />
                      ) : (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 underline text-xs opacity-80 truncate max-w-[200px]"
                        >
                          {m.fileUrl.split("/").pop() ?? "Attachment"}
                        </a>
                      )
                    )}
                  </Bubble>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            {files.length > 0 && (
              <div className="px-3 pt-2 flex gap-2 flex-wrap border-t border-border">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  e.target.value = "";
                }}
              />
              <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Attach files">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message…"
                className="flex-1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button size="icon" onClick={handleSend} disabled={sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Bubble({ who, children, time }: { who: "me" | "them"; children: ReactNode; time?: string }) {
  const me = who === "me";
  return (
    <div className={`flex flex-col gap-0.5 ${me ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
          me ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {children}
      </div>
      {time && (
        <span className="text-[10px] text-muted-foreground px-1">{time}</span>
      )}
    </div>
  );
}

type RescheduleForm = { date: string; time: string; location: string };

function Bookings() {
  const { format } = useCurrency();
  const [bookings, setBookings] = useState<ProBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({ date: "", time: "", location: "" });
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [bookingReturnRequests, setBookingReturnRequests] = useState<ReturnRequest[]>([]);
  const [bookingApprovingRequest, setBookingApprovingRequest] = useState<ReturnRequest | null>(null);
  const [bookingApprovalType, setBookingApprovalType] = useState<"full" | "partial">("full");
  const [bookingPartialAmount, setBookingPartialAmount] = useState("");
  const [bookingApproving, setBookingApproving] = useState(false);
  const [bookingEvidenceUrls, setBookingEvidenceUrls] = useState<string[]>([]);
  const [bookingEvidenceLoading, setBookingEvidenceLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchProBookings(), fetchProReturnRequests()])
      .then(([bks, rrs]) => {
        setBookings(bks);
        setBookingReturnRequests(rrs.filter((r) => r.bookingId !== null));
      })
      .catch(() => toast.error("Failed to load bookings."))
      .finally(() => setLoading(false));
  }, []);

  const rrByBooking: Record<string, ReturnRequest> = {};
  for (const rr of bookingReturnRequests) {
    if (rr.bookingId) rrByBooking[rr.bookingId] = rr;
  }

  async function handleBookingApprove() {
    if (!bookingApprovingRequest) return;
    if (bookingApprovalType === "partial" && !bookingPartialAmount) {
      toast.error("Enter a partial refund amount.");
      return;
    }
    setBookingApproving(true);
    try {
      await approveReturnRequest(bookingApprovingRequest.id, bookingApprovalType, bookingApprovalType === "partial" ? parseFloat(bookingPartialAmount) : undefined);
      setBookingReturnRequests((prev) => prev.map((r) => r.id === bookingApprovingRequest.id ? { ...r, status: "pro_approved", refundType: bookingApprovalType, partialAmount: bookingApprovalType === "partial" ? parseFloat(bookingPartialAmount) : null } : r));
      toast.success("Return request approved. Admin will process the refund.");
      setBookingApprovingRequest(null);
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setBookingApproving(false);
    }
  }

  async function handleBookingDecline(rr: ReturnRequest) {
    try {
      await declineReturnRequest(rr.id);
      setBookingReturnRequests((prev) => prev.map((r) => r.id === rr.id ? { ...r, status: "pro_declined" } : r));
      toast.success("Return request declined.");
    } catch {
      toast.error("Failed to decline request.");
    }
  }

  async function handleMarkPaid(id: string) {
    setUpdating((prev) => new Set(prev).add(id));
    try {
      await markBookingPaid(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, paymentStatus: "paid" } : b)));
      toast.success("Booking marked as paid.");
    } catch {
      toast.error("Failed to mark booking as paid.");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleStatusChange(id: string, status: "confirmed" | "cancelled" | "completed") {
    setUpdating((prev) => new Set(prev).add(id));
    try {
      await updateBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      toast.success(
        status === "confirmed" ? "Booking accepted." :
        status === "completed" ? "Booking marked as completed." :
        "Booking declined."
      );
    } catch {
      toast.error("Failed to update booking.");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function oneHourFromNow(): string {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function openReschedule(b: ProBookingRecord) {
    const today = new Date().toISOString().split("T")[0];
    const date = b.date ?? "";
    const time = date === today ? oneHourFromNow() : (b.time ?? "");
    setRescheduleForm({ date, time, location: b.location ?? "" });
    setRescheduleId(b.id);
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleId) return;
    const chosen = new Date(`${rescheduleForm.date}T${rescheduleForm.time || "00:00"}:00`);
    if (chosen <= new Date()) {
      toast.error("You cannot reschedule to a date or time that has already passed.");
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleBooking(rescheduleId, rescheduleForm.date, rescheduleForm.time, rescheduleForm.location);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === rescheduleId
            ? { ...b, date: rescheduleForm.date, time: rescheduleForm.time, location: rescheduleForm.location }
            : b
        )
      );
      toast.success("Booking rescheduled.");
      setRescheduleId(null);
    } catch {
      toast.error("Failed to reschedule booking.");
    } finally {
      setRescheduling(false);
    }
  }

  const statusTone: Record<string, string> = {
    pending:   "bg-amber-500/15 text-amber-500 border-amber-500/20",
    confirmed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    completed: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    cancelled: "bg-red-500/15 text-red-500 border-red-500/20",
  };

  const tabs = [
    { id: "all"       as const, label: "All" },
    { id: "pending"   as const, label: "Pending" },
    { id: "confirmed" as const, label: "Confirmed" },
    { id: "completed" as const, label: "Completed" },
    { id: "cancelled" as const, label: "Cancelled" },
  ];

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading bookings…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
              filter === tab.id ? "bg-white/20" : "bg-background"
            }`}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border bg-card text-center">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No bookings found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "all"
              ? "Booking requests will appear here once clients book your services."
              : `No ${filter} bookings at this time.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const initials = b.clientName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
            const busy = updating.has(b.id);

            const timeStr = b.time ? b.time.slice(0, 5) : "00:00";
            const bookingDateTime = b.date
              ? new Date(`${b.date}T${timeStr}:00`)
              : null;
            const bookingArrived = bookingDateTime ? bookingDateTime <= new Date() : false;

            const formattedDate = b.date
              ? new Date(b.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })
              : b.date;

            const formattedTime = b.time
              ? (() => {
                  const [h, m] = b.time.split(":");
                  const hour = parseInt(h, 10);
                  return `${hour % 12 || 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
                })()
              : "";

            return (
              <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Card header — client info + status */}
                <div className="flex items-start justify-between gap-4 p-5 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold">{b.clientName}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5">
                        {b.clientEmail && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />{b.clientEmail}
                          </span>
                        )}
                        {b.clientPhone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />{b.clientPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${statusTone[b.status] ?? ""} capitalize border font-medium`}>
                      {b.status}
                    </Badge>
                    {b.paymentStatus === "paid" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 border font-medium gap-1">
                        <Check className="h-3 w-3" /> Paid
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 border font-medium">
                        Unpaid
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card body — two-column layout */}
                <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
                  {/* Left: service details */}
                  <div className="p-5 space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Service Details</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-sm">
                        <Briefcase className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <span className="font-medium">{b.service}</span>
                      </div>
                      {b.packageName && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{b.packageName}</span>
                        </div>
                      )}
                      {b.duration > 0 && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{b.duration} {b.duration === 1 ? "hour" : "hours"}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{formattedDate}{formattedTime ? ` · ${formattedTime}` : ""}</span>
                      </div>
                      {b.location && (
                        <div className="flex items-start gap-2.5 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{b.location}</span>
                        </div>
                      )}
                    </div>
                    {b.notes && (
                      <div className="rounded-lg bg-muted/50 border border-border/60 p-3 text-xs text-muted-foreground italic leading-relaxed">
                        "{b.notes}"
                      </div>
                    )}
                  </div>

                  {/* Right: price breakdown */}
                  <div className="p-5 space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Price Breakdown</p>
                    <div className="rounded-lg border border-border bg-background/60 divide-y divide-border overflow-hidden">
                      {b.packageName && (
                        <div className="flex items-center justify-between px-3 py-2.5 text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Package className="h-3 w-3 shrink-0" />{b.packageName}
                          </span>
                          <span className="font-medium">{format(b.packagePrice)}</span>
                        </div>
                      )}
                      {b.addons.map((addon, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Tag className="h-3 w-3 shrink-0" />{addon.name}
                          </span>
                          <span className="text-muted-foreground">+{format(addon.price)}</span>
                        </div>
                      ))}
                      {b.tip > 0 && (
                        <div className="flex items-center justify-between px-3 py-2.5 text-sm">
                          <span className="text-muted-foreground">Tip</span>
                          <span className="text-emerald-500 font-medium">+{format(b.tip)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="font-bold text-primary">{format(b.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card footer — actions for pending */}
                {b.status === "pending" && (
                  <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy}
                      onClick={() => handleStatusChange(b.id, "cancelled")}
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={busy}
                      onClick={() => handleStatusChange(b.id, "confirmed")}
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </Button>
                  </div>
                )}

                {/* Card footer — mark paid for completed unpaid bookings */}
                {b.status === "completed" && b.paymentStatus !== "paid" && !rrByBooking[b.id] && (
                  <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600"
                      disabled={busy}
                      onClick={() => handleMarkPaid(b.id)}
                    >
                      <DollarSign className="h-3.5 w-3.5" /> Mark as Paid
                    </Button>
                  </div>
                )}

                {/* Card footer — completed booking return request */}
                {b.status === "completed" && rrByBooking[b.id] && (
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-muted/10 flex-wrap">
                    {rrByBooking[b.id].status === "pending" && (
                      <>
                        <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Client submitted a refund request
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                          onClick={() => {
                            const rr = rrByBooking[b.id];
                            setBookingApprovingRequest(rr);
                            setBookingApprovalType("full");
                            setBookingPartialAmount("");
                            setBookingEvidenceUrls([]);
                            setBookingEvidenceLoading(true);
                            fetchReturnEvidence(rr.id)
                              .then(setBookingEvidenceUrls)
                              .finally(() => setBookingEvidenceLoading(false));
                          }}
                        >
                          <RefreshCw className="h-3 w-3" /> Review Request
                        </Button>
                      </>
                    )}
                    {rrByBooking[b.id].status === "pro_approved" && (
                      <p className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Refund approved ({rrByBooking[b.id].refundType === "partial" ? `Partial $${rrByBooking[b.id].partialAmount?.toFixed(2)}` : "Full"}) — awaiting admin
                      </p>
                    )}
                    {rrByBooking[b.id].status === "pro_declined" && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                        <X className="h-3.5 w-3.5" /> Refund request declined
                      </p>
                    )}
                    {rrByBooking[b.id].status === "refunded" && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Refunded
                      </p>
                    )}
                  </div>
                )}

                {/* Card footer — cancelled booking refund status */}
                {b.status === "cancelled" && (b.paymentStatus === "paid" || b.refunded || rrByBooking[b.id]) && (
                  <div className="flex items-center gap-3 px-5 py-4 border-t border-border bg-muted/10 flex-wrap">
                    {b.refunded ? (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Refund issued
                      </p>
                    ) : rrByBooking[b.id] ? (
                      <>
                        {rrByBooking[b.id].status === "pending" && (
                          <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" /> Refund request pending review
                          </p>
                        )}
                        {rrByBooking[b.id].status === "pro_approved" && (
                          <p className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Refund approved ({rrByBooking[b.id].refundType === "partial" ? `Partial $${rrByBooking[b.id].partialAmount?.toFixed(2)}` : "Full"}) — awaiting admin
                          </p>
                        )}
                        {rrByBooking[b.id].status === "pro_declined" && (
                          <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                            <X className="h-3.5 w-3.5" /> Refund request declined
                          </p>
                        )}
                        {rrByBooking[b.id].status === "refunded" && (
                          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Refunded
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" /> Payment collected — no refund requested
                      </p>
                    )}
                  </div>
                )}

                {/* Card footer — actions for confirmed */}
                {b.status === "confirmed" && (
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-muted/10 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy}
                      onClick={() => setCancelTarget(b.id)}
                    >
                      <X className="h-3.5 w-3.5" /> Cancel Booking
                    </Button>
                    <div className="flex items-center gap-3 flex-wrap">
                      {b.paymentStatus !== "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600"
                          disabled={busy}
                          onClick={() => handleMarkPaid(b.id)}
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Mark as Paid
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busy}
                        onClick={() => openReschedule(b)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={busy || !bookingArrived}
                        title={!bookingArrived ? "Available once the booking date and time has passed" : undefined}
                        onClick={() => handleStatusChange(b.id, "completed")}
                      >
                        {!bookingArrived ? <Lock className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        Complete Booking
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule dialog */}
      <Dialog open={rescheduleId !== null} onOpenChange={(open) => { if (!open) setRescheduleId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="rs-date">Date</Label>
              <Input
                id="rs-date"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={rescheduleForm.date}
                onChange={(e) => {
                  const today = new Date().toISOString().split("T")[0];
                  const newDate = e.target.value;
                  setRescheduleForm((f) => ({ ...f, date: newDate, time: newDate === today ? oneHourFromNow() : "" }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-time">Time</Label>
              <Input
                id="rs-time"
                type="time"
                required
                min={
                  rescheduleForm.date === new Date().toISOString().split("T")[0]
                    ? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`
                    : undefined
                }
                value={rescheduleForm.time}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-location">Location</Label>
              <Input
                id="rs-location"
                type="text"
                placeholder="Enter location"
                required
                value={rescheduleForm.location}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRescheduleId(null)} disabled={rescheduling}>
                Cancel
              </Button>
              <Button type="submit" disabled={rescheduling}>
                {rescheduling ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel booking confirmation */}
      <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Cancelling a confirmed booking will notify the client and flag the booking for a refund review by the TradeHub admin team.</p>
                <p className="text-xs text-muted-foreground">
                  Repeated cancellations may impact your seller rating. Only cancel if absolutely necessary.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelTarget(null)}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelTarget) handleStatusChange(cancelTarget, "cancelled");
                setCancelTarget(null);
              }}
            >
              Yes, Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booking refund request review dialog */}
      <Dialog open={bookingApprovingRequest !== null} onOpenChange={(open) => { if (!open) setBookingApprovingRequest(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Refund Request</DialogTitle>
            <p className="text-sm text-muted-foreground">Booking #{bookingApprovingRequest?.bookingId?.slice(0, 8)}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs font-medium text-foreground mb-1">Client's reason</p>
              <p className="text-sm text-muted-foreground">{bookingApprovingRequest?.reason}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Proof submitted by client</p>
              {bookingEvidenceLoading ? (
                <p className="text-xs text-muted-foreground">Loading evidence…</p>
              ) : bookingEvidenceUrls.length === 0 ? (
                <p className="text-xs text-muted-foreground">No images provided.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bookingEvidenceUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Evidence ${i + 1}`}
                        className="h-20 w-20 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Refund type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["full", "partial"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBookingApprovalType(t)}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      bookingApprovalType === t
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {t === "full" ? "Full Refund" : "Partial Refund"}
                  </button>
                ))}
              </div>
            </div>

            {bookingApprovalType === "partial" && (
              <div className="space-y-1.5">
                <Label htmlFor="bk-partial-amt">Partial refund amount ($)</Label>
                <Input
                  id="bk-partial-amt"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={bookingPartialAmount}
                  onChange={(e) => setBookingPartialAmount(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 p-3 text-xs text-muted-foreground">
              Approving passes this request to the TradeHub admin team to issue the refund. You cannot reverse this decision.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={bookingApproving}
              onClick={() => { if (bookingApprovingRequest) handleBookingDecline(bookingApprovingRequest); setBookingApprovingRequest(null); }}
            >
              Decline Request
            </Button>
            <Button size="sm" disabled={bookingApproving} onClick={handleBookingApprove}>
              {bookingApproving ? "Approving…" : "Approve Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Payments() {
  const { format } = useCurrency();

  const payments = [
    { ref: "ElecXr8K", client: "Sarah Bennett",  service: "Panel Upgrade",        amount: 640,  date: "1/26/2026", method: "Bank Transfer", refund: null,  status: "paid" },
    { ref: "Plmb2Qw9", client: "James Foster",   service: "EV Charger Install",   amount: 980,  date: "1/26/2026", method: "Card",          refund: null,  status: "paid" },
    { ref: "RoofTj4M", client: "Aisha Khan",     service: "Roof Repair",          amount: 420,  date: "1/25/2026", method: "Bank Transfer", refund: null,  status: "paid" },
    { ref: "HvacPo7N", client: "Diego Morales",  service: "HVAC Service",         amount: 180,  date: "1/25/2026", method: "Link",          refund: null,  status: "paid" },
    { ref: "CarpLs2R", client: "Emily Walsh",    service: "Carpentry Work",       amount: 320,  date: "1/25/2026", method: "Card",          refund: null,  status: "paid" },
    { ref: "WeldKa5T", client: "Tom Caldwell",   service: "Welding Job",          amount: 560,  date: "1/24/2026", method: "Bank Transfer", refund: 560,   status: "refunded" },
  ];

  const totalEarnings   = payments.reduce((s, p) => s + p.amount, 0);
  const totalRefunds    = payments.reduce((s, p) => s + (p.refund ?? 0), 0);
  const totalRemaining  = totalEarnings - totalRefunds;
  const refundCount     = payments.filter((p) => p.refund).length;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button className="gap-2">+ Add Payment Method</Button>
        <Button variant="outline">View Payout Receipts</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium leading-tight">Total Earnings</p>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{format(totalEarnings)}</p>
        </div>

        {/* Total Withdrawal */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              <ArrowDownCircle className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-sm font-medium leading-tight">Total Withdrawal</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold">{format(0)}</p>
            <Button size="sm" className="ml-auto">Withdraw</Button>
          </div>
        </div>

        {/* Total Remaining */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-violet-500" />
            </div>
            <p className="text-sm font-medium leading-tight">Total Remaining</p>
          </div>
          <p className="text-2xl font-bold text-violet-500">{format(totalRemaining)}</p>
        </div>

        {/* Total Refunds */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-sm font-medium leading-tight">Total Refunds</p>
          </div>
          <p className="text-2xl font-bold text-amber-500">{format(totalRefunds)}</p>
          <p className="text-xs text-muted-foreground mt-1">{refundCount} refund{refundCount !== 1 ? "s" : ""} given</p>
        </div>
      </div>

      {/* Recent Payments table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Recent Payments</h2>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {["Booking Ref.", "Client", "Trade Service", "Payment", "Payment Date", "Payment Method", "Refund", "Payment Status", "Actions"].map((h) => (
                  <th key={h} className="py-2 pr-4 font-semibold text-primary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.ref} className="border-t border-border">
                  <td className="py-3 pr-4 font-semibold">{p.ref}</td>
                  <td className="pr-4">{p.client}</td>
                  <td className="pr-4">{p.service}</td>
                  <td className="pr-4 text-emerald-500 font-medium">{format(p.amount)}</td>
                  <td className="pr-4 text-muted-foreground">{p.date}</td>
                  <td className="pr-4">{p.method}</td>
                  <td className="pr-4 text-red-500">{p.refund ? format(p.refund) : "–"}</td>
                  <td className="pr-4">
                    <span className={p.status === "paid" ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                      {p.status === "paid" ? "Paid" : "Refunded"}
                    </span>
                  </td>
                  <td>
                    <button className="text-primary hover:underline text-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AllActivity() {
  const [activeFilter, setActiveFilter] = useState<"all" | "review" | "like" | "view">("all");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "daily" | "weekly">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [activityStats, setActivityStats] = useState({
    total: 0, reviews: 0, likes: 0, profileViews: 0,
    bookings: 0, messages: 0, payments: 0, orders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProActivity(), fetchProActivityStats()])
      .then(([acts, stats]) => {
        setActivities(acts);
        setActivityStats(stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allItems = activities.map(formatActivityRecord);

  const stats = [
    { id: "all" as const,    label: "All Activity",   count: activityStats.total,        numberColor: "text-primary" },
    { id: "review" as const, label: "Reviews",        count: activityStats.reviews,      numberColor: "text-amber-400" },
    { id: "like" as const,   label: "Likes",          count: activityStats.likes,        numberColor: "text-pink-500" },
    { id: "view" as const,   label: "Profile Views",  count: activityStats.profileViews, numberColor: "text-blue-400" },
  ];

  const types  = ["all", "view", "like", "review", "message", "booking", "payment", "order", "refund_request"];

  const filtered = allItems.filter((item) => {
    if (activeFilter !== "all" && item.type !== activeFilter) return false;
    if (timeFilter !== "all") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
      if (timeFilter === "daily" && item._ts < todayStart) return false;
      if (timeFilter === "weekly" && item._ts < weekStart) return false;
    }
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (search && !item.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Stat filter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveFilter(s.id)}
            className={`rounded-xl border bg-card p-5 text-center transition-all ${
              activeFilter === s.id
                ? "border-primary ring-1 ring-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <p className={`text-3xl font-bold ${s.numberColor}`}>{s.count}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 text-sm min-w-[140px]">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as "all" | "daily" | "weekly")}
              className="bg-transparent py-2 text-sm text-foreground focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-background text-foreground">All Time</option>
              <option value="daily" className="bg-background text-foreground">Today</option>
              <option value="weekly" className="bg-background text-foreground">This Week</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 text-sm min-w-[140px]">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent py-2 text-sm text-foreground focus:outline-none w-full cursor-pointer"
            >
              {types.map((t) => (
                <option key={t} value={t} className="bg-background text-foreground">{t === "all" ? "All Types" : ACTIVITY_TYPE_CONFIG[t]?.label ?? t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity History */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Activity History</h2>
          </div>
          <p className="text-xs text-muted-foreground">Activities are kept for 30 days.</p>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-10">Loading activity…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No activity found.</p>
          ) : (
            filtered.map((item) => {
              const cfg = ACTIVITY_TYPE_CONFIG[item.type] ?? ACTIVITY_TYPE_CONFIG["view"];
              return (
                <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{item.date} at {item.time}</span>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{item.month}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs whitespace-nowrap">{cfg.label}</Badge>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MerchandiseOrders({ onBack }: { onBack: () => void }) {
  const { format } = useCurrency();
  const [orders, setOrders] = useState<ProOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [approvingRequest, setApprovingRequest] = useState<ReturnRequest | null>(null);
  const [approvalType, setApprovalType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [approving, setApproving] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchProOrders(), fetchProReturnRequests()])
      .then(([o, rr]) => {
        setOrders(o);
        setReturnRequests(rr.filter((r) => r.orderId !== null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rrByOrder: Record<number, ReturnRequest> = {};
  for (const rr of returnRequests) {
    if (rr.orderId) rrByOrder[rr.orderId] = rr;
  }

  async function handleApprove() {
    if (!approvingRequest) return;
    const amount = approvalType === "partial" ? Number(partialAmount) : undefined;
    if (approvalType === "partial" && (!partialAmount || isNaN(amount!))) {
      toast.error("Enter a valid partial refund amount.");
      return;
    }
    setApproving(true);
    try {
      await approveReturnRequest(approvingRequest.id, approvalType, amount);
      setReturnRequests((prev) =>
        prev.map((r) =>
          r.id === approvingRequest.id
            ? { ...r, status: "pro_approved", refundType: approvalType, partialAmount: amount ?? null }
            : r
        )
      );
      toast.success("Return request approved. The admin will issue the refund.");
      setApprovingRequest(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to approve request");
    } finally {
      setApproving(false);
    }
  }

  async function handleDecline(rr: ReturnRequest) {
    try {
      await declineReturnRequest(rr.id);
      setReturnRequests((prev) =>
        prev.map((r) => (r.id === rr.id ? { ...r, status: "pro_declined" } : r))
      );
      toast.success("Return request declined.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to decline request");
    }
  }

  async function markFulfilled(orderId: number, method: string) {
    setUpdating(orderId);
    try {
      await updateOrderFulfillment(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, isDelivered: true } : o)),
      );
      toast.success(method === "delivery" ? "Marked as delivered" : "Marked as picked up");
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">Shop Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Orders placed by clients for your merchandise.
          </p>
        </div>
      </div>

      {/* Return obligation notice */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
          <RefreshCw className="h-4 w-4 shrink-0" />
          Return & Refund Obligations
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
          <li>· You must honour return requests within <span className="font-medium text-foreground">14 days of delivery</span> for items that are unused, in original condition, and in original packaging.</li>
          <li>· For faulty or misrepresented items, provide a full refund or replacement at no cost to the buyer — reports must be raised within 48 hrs of delivery.</li>
          <li>· Failure to honour legitimate returns may result in TradeHub issuing a refund from your escrow balance.</li>
          <li>· Custom-made and perishable items, or items you've explicitly marked non-returnable, are exempt.</li>
        </ul>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground text-center py-10">Loading orders…</div>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center text-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Orders from your clients will appear here.
          </p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              {/* Order header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{order.clientName || "Client"}</p>
                    <Badge
                      variant={order.shippingMethod === "delivery" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {order.shippingMethod === "delivery" ? "Delivery" : "Pickup"}
                    </Badge>
                    {order.isDelivered && (
                      <Badge
                        variant="outline"
                        className="text-xs gap-1 text-green-600 border-green-500"
                      >
                        <Check className="h-3 w-3" />
                        {order.shippingMethod === "delivery" ? "Delivered" : "Picked Up"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Order #{order.id} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {order.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {order.email}
                    </p>
                  )}
                  {order.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {order.phone}
                    </p>
                  )}
                  {order.shippingAddress && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {order.shippingAddress}
                    </p>
                  )}
                </div>
                <p className="font-bold text-lg">{format(order.totalPrice)}</p>
              </div>

              {/* Items */}
              {order.items.length > 0 && (
                <div className="rounded-lg bg-muted/30 divide-y divide-border overflow-hidden">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.serviceName || "Item"}
                          className="h-10 w-10 rounded object-cover shrink-0 border border-border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{item.serviceName || "Item"}</span>
                      <span className="text-muted-foreground mx-3">×{item.quantity}</span>
                      <span className="font-medium">
                        {format(item.productPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{format(order.subTotal)}</span>
                </div>
                {order.shippingTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery fee</span>
                    <span>{format(order.shippingTotal)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{format(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span>{format(order.totalPrice)}</span>
                </div>
              </div>

              {/* Fulfillment action */}
              {!order.isDelivered && (
                <div className="flex gap-2 flex-wrap">
                  {order.shippingMethod === "delivery" ? (
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={updating === order.id}
                      onClick={() => markFulfilled(order.id, order.shippingMethod)}
                    >
                      <Truck className="h-4 w-4" />
                      {updating === order.id ? "Updating…" : "Mark as Delivered"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={updating === order.id}
                      onClick={() => markFulfilled(order.id, order.shippingMethod)}
                    >
                      <Package className="h-4 w-4" />
                      {updating === order.id ? "Updating…" : "Mark as Picked Up"}
                    </Button>
                  )}
                </div>
              )}

              {/* Return window + refund request status */}
              {(() => {
                const daysSince = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                const daysLeft = Math.max(0, 14 - daysSince);
                const withinWindow = daysLeft > 0;
                const rr = rrByOrder[order.id] ?? null;
                return (
                  <div className="flex items-center justify-between pt-3 border-t border-border gap-3 flex-wrap">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                        {withinWindow
                          ? <span>Return window: <span className="font-medium text-foreground">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</span></span>
                          : <span className="text-muted-foreground/60">Return window closed</span>
                        }
                      </p>
                      {rr && (
                        <p className="text-xs flex items-center gap-1.5">
                          {rr.status === "pending" && <span className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Return request pending your review</span>}
                          {rr.status === "pro_approved" && <span className="text-blue-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> You approved — awaiting admin refund ({rr.refundType === "partial" ? `Partial $${rr.partialAmount?.toFixed(2)}` : "Full"})</span>}
                          {rr.status === "pro_declined" && <span className="text-red-500 font-medium flex items-center gap-1"><X className="h-3 w-3" /> Return declined</span>}
                          {rr.status === "refunded" && <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Refunded</span>}
                        </p>
                      )}
                    </div>
                    {rr?.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                        onClick={() => {
                          setApprovingRequest(rr);
                          setApprovalType("full");
                          setPartialAmount("");
                          setEvidenceUrls([]);
                          setEvidenceLoading(true);
                          fetchReturnEvidence(rr.id)
                            .then(setEvidenceUrls)
                            .finally(() => setEvidenceLoading(false));
                        }}
                      >
                        <RefreshCw className="h-3 w-3" /> Review Request
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Approve Return dialog */}
      <Dialog open={approvingRequest !== null} onOpenChange={(open) => { if (!open) setApprovingRequest(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Return Request</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Order #{approvingRequest ? String(approvingRequest.orderId).padStart(6, "0") : ""}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs font-medium text-foreground mb-1">Client's reason</p>
              <p className="text-sm text-muted-foreground">{approvingRequest?.reason}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Proof submitted by client</p>
              {evidenceLoading ? (
                <p className="text-xs text-muted-foreground">Loading evidence…</p>
              ) : evidenceUrls.length === 0 ? (
                <p className="text-xs text-muted-foreground">No images provided.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {evidenceUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Evidence ${i + 1}`}
                        className="h-20 w-20 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Refund type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["full", "partial"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setApprovalType(t)}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      approvalType === t
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {t === "full" ? "Full Refund" : "Partial Refund"}
                  </button>
                ))}
              </div>
            </div>

            {approvalType === "partial" && (
              <div className="space-y-1.5">
                <Label htmlFor="partial-amt">Partial refund amount ($)</Label>
                <Input
                  id="partial-amt"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 p-3 text-xs text-muted-foreground">
              Approving this request passes it to the TradeHub admin team to issue the refund. You cannot reverse this decision.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={approving}
              onClick={() => { if (approvingRequest) handleDecline(approvingRequest); setApprovingRequest(null); }}
            >
              Decline Request
            </Button>
            <Button size="sm" disabled={approving} onClick={handleApprove}>
              {approving ? "Approving…" : "Approve Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Merchandise() {
  const { format } = useCurrency();
  const [showOrders, setShowOrders] = useState(false);
  const [items, setItems] = useState<MerchandiseItemWithVariants[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Delivery fee ──────────────────────────────────────────
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  const MAX_IMAGES = 5;

  // ── Add item state ────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "" });
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [newVariants, setNewVariants] = useState<{ size: string; color: string; price: string; stock: string }[]>([]);
  const [newVariantDraft, setNewVariantDraft] = useState({ size: "", color: "", price: "", stock: "" });

  // ── Edit item state ───────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", description: "" });
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [editVariantDraft, setEditVariantDraft] = useState({ size: "", color: "", price: "", stock: "" });
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [variantEditDraft, setVariantEditDraft] = useState({ size: "", color: "", price: "", stock: "" });

  useEffect(() => {
    fetchMerchandise()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchMyDeliveryFee().then((fee) => {
      if (fee !== null) setDeliveryFeeInput(String(fee));
    });
  }, []);

  // ── Add item handlers ─────────────────────────────────────
  function addNewVariantToList() {
    if (!newVariantDraft.price) return;
    setNewVariants((prev) => [...prev, newVariantDraft]);
    setNewVariantDraft({ size: "", color: "", price: "", stock: "" });
  }

  function handleNewImagesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - newImageFiles.length;
    if (remaining <= 0) return;
    const toAdd = files.slice(0, remaining);
    setNewImageFiles((prev) => [...prev, ...toAdd]);
    setNewImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeNewImage(idx: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function addItem() {
    if (!newItem.name) return;
    try {
      const saved = await addMerchandiseItem({
        productName:        newItem.name,
        productDescription: newItem.description,

      });
      const savedImages: MerchandiseImage[] = [];
      for (const file of newImageFiles) {
        const url = await uploadMerchandiseImage(file, saved.id);
        const img = await saveMerchandiseImageUrl(saved.id, url);
        savedImages.push(img);
      }
      const savedVariants: MerchandiseVariant[] = [];
      for (const v of newVariants) {
        const sv = await addVariant({
          productId:       saved.id,
          productSize:     v.size,
          productColor:    v.color,
          productPrice:    v.price,
          productQuantity: Number(v.stock) || 0,
        });
        savedVariants.push(sv);
      }
      setItems((prev) => [...prev, { ...saved, variants: savedVariants, images: savedImages }]);
      setNewItem({ name: "", description: "" });
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setNewVariants([]);
      setShowAdd(false);
      toast.success("Item saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    }
  }

  // ── Edit item handlers ────────────────────────────────────
  function startEdit(item: MerchandiseItemWithVariants) {
    setEditingId(item.id);
    setEditDraft({ name: item.productName, description: item.productDescription });
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setEditVariantDraft({ size: "", color: "", price: "", stock: "" });
    setEditingVariantId(null);
    setShowAdd(false);
  }

  function handleEditImagesSelected(e: React.ChangeEvent<HTMLInputElement>, existingCount: number) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - existingCount - editImageFiles.length;
    if (remaining <= 0) return;
    const toAdd = files.slice(0, remaining);
    setEditImageFiles((prev) => [...prev, ...toAdd]);
    setEditImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeEditStagedImage(idx: number) {
    setEditImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function removeExistingImage(imageId: number, imageUrl: string) {
    try {
      await deleteMerchandiseImageUrl(imageId, imageUrl);
      setItems((prev) => prev.map((i) =>
        i.id === editingId ? { ...i, images: i.images.filter((img) => img.id !== imageId) } : i
      ));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove image");
    }
  }

  async function saveEdit() {
    if (editingId === null) return;
    try {
      const updated = { id: editingId, productName: editDraft.name, productDescription: editDraft.description };
      await updateMerchandiseItem(updated);
      const newlySavedImages: MerchandiseImage[] = [];
      for (const file of editImageFiles) {
        const url = await uploadMerchandiseImage(file, editingId);
        const img = await saveMerchandiseImageUrl(editingId, url);
        newlySavedImages.push(img);
      }
      setItems((prev) => prev.map((i) =>
        i.id === editingId
          ? { ...i, ...updated, images: [...i.images, ...newlySavedImages] }
          : i
      ));
      setEditingId(null);
      setEditImageFiles([]);
      setEditImagePreviews([]);
      toast.success("Changes saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    }
  }

  async function addEditVariant() {
    if (editingId === null || !editVariantDraft.price) return;
    try {
      const saved = await addVariant({
        productId:       editingId,
        productSize:     editVariantDraft.size,
        productColor:    editVariantDraft.color,
        productPrice:    editVariantDraft.price,
        productQuantity: Number(editVariantDraft.stock) || 0,
      });
      setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, variants: [...i.variants, saved] } : i));
      setEditVariantDraft({ size: "", color: "", price: "", stock: "" });
      toast.success("Variant added!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add variant");
    }
  }

  function startVariantEdit(v: MerchandiseVariant) {
    setEditingVariantId(v.id);
    setVariantEditDraft({ size: v.productSize, color: v.productColor, price: v.productPrice, stock: String(v.productQuantity) });
  }

  async function saveVariantEdit() {
    if (editingVariantId === null || editingId === null) return;
    try {
      const updated: MerchandiseVariant = {
        id:              editingVariantId,
        productId:       editingId,
        productSize:     variantEditDraft.size,
        productColor:    variantEditDraft.color,
        productPrice:    variantEditDraft.price,
        productQuantity: Number(variantEditDraft.stock) || 0,
      };
      await updateVariant(updated);
      setItems((prev) => prev.map((i) =>
        i.id === editingId
          ? { ...i, variants: i.variants.map((v) => v.id === editingVariantId ? updated : v) }
          : i
      ));
      setEditingVariantId(null);
      toast.success("Variant updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update variant");
    }
  }

  async function removeEditVariant(variantId: number) {
    try {
      await deleteVariant(variantId);
      setItems((prev) => prev.map((i) =>
        i.id === editingId ? { ...i, variants: i.variants.filter((v) => v.id !== variantId) } : i
      ));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove variant");
    }
  }

  async function removeItem(id: number) {
    try {
      await deleteMerchandiseItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove item");
    }
  }

  // ── Shared variant input row ──────────────────────────────
  function VariantInputRow({ draft, setDraft, onAdd, label }: {
    draft: { size: string; color: string; price: string; stock: string };
    setDraft: React.Dispatch<React.SetStateAction<{ size: string; color: string; price: string; stock: string }>>;
    onAdd: () => void;
    label: string;
  }) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Size</Label>
            <Input placeholder="e.g. M" value={draft.size} onChange={(e) => setDraft((p) => ({ ...p, size: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <Input placeholder="e.g. Red" value={draft.color} onChange={(e) => setDraft((p) => ({ ...p, color: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price ($) *</Label>
            <Input type="number" min={0} placeholder="0.00" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stock</Label>
            <Input type="number" min={0} placeholder="0" value={draft.stock} onChange={(e) => setDraft((p) => ({ ...p, stock: e.target.value }))} className="h-8 text-sm" />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Variant
        </Button>
      </div>
    );
  }

  if (showOrders) {
    return <MerchandiseOrders onBack={() => setShowOrders(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Shop Merchandise</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and sell branded items to your clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowOrders(true)}>
            <ClipboardList className="h-4 w-4" /> View Orders
          </Button>
          <Button className="gap-2" onClick={() => { setShowAdd((v) => !v); setEditingId(null); }}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Delivery Fee */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold">Delivery Fee</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Charged to clients who choose delivery at checkout.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={deliveryFeeInput}
                onChange={(e) => setDeliveryFeeInput(e.target.value)}
                className="pl-7"
              />
            </div>
            <Button
              size="sm"
              disabled={savingFee}
              onClick={async () => {
                setSavingFee(true);
                try {
                  const parsed = deliveryFeeInput === "" ? null : parseFloat(deliveryFeeInput);
                  await saveDeliveryFee(parsed);
                  toast.success("Delivery fee saved");
                } catch {
                  toast.error("Failed to save delivery fee");
                } finally {
                  setSavingFee(false);
                }
              }}
            >
              {savingFee ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Add Item Form */}
      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <p className="font-semibold">New Merchandise Item</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Product Images</Label>
                <span className="text-xs text-muted-foreground">{newImageFiles.length} / {MAX_IMAGES}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {newImagePreviews.map((src, idx) => (
                  <div key={idx} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt={`preview-${idx}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {newImageFiles.length < MAX_IMAGES && (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center">Add photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleNewImagesSelected} />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Up to {MAX_IMAGES} images · JPG, PNG</p>
            </div>
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input placeholder="e.g. Branded Hard Hat" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the item — material, sizing, use case…" rows={3} value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          {/* Pending variants */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Variants</p>
            {newVariants.length > 0 && (
              <div className="space-y-1">
                {newVariants.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span className="flex-1">{[v.size, v.color].filter(Boolean).join(" / ") || "—"}</span>
                    <span className="text-muted-foreground">${v.price} · {v.stock || 0} in stock</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setNewVariants((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <VariantInputRow draft={newVariantDraft} setDraft={setNewVariantDraft} onAdd={addNewVariantToList} label="Add variant" />
          </div>

          <div className="flex gap-3">
            <Button onClick={addItem}>Save Item</Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setNewVariants([]); setNewItem({ name: "", description: "" }); setNewImageFiles([]); setNewImagePreviews([]); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Edit Item Form */}
      {editingId !== null && (() => {
        const editingItem = items.find((i) => i.id === editingId);
        return (
          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <p className="font-semibold">Edit Merchandise Item</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                {(() => {
                  const existingImages = editingItem?.images ?? [];
                  const totalCount = existingImages.length + editImageFiles.length;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Product Images</Label>
                        <span className="text-xs text-muted-foreground">{totalCount} / {MAX_IMAGES}</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {existingImages.map((img) => (
                          <div key={img.id} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                            <img src={img.imageUrl} alt="product" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(img.id, img.imageUrl)}
                              className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {editImagePreviews.map((src, idx) => (
                          <div key={`new-${idx}`} className="relative h-24 w-24 rounded-lg overflow-hidden border border-primary/40">
                            <img src={src} alt={`new-${idx}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeEditStagedImage(idx)}
                              className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {totalCount < MAX_IMAGES && (
                          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                            <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground text-center">Add photo</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleEditImagesSelected(e, existingImages.length)} />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Up to {MAX_IMAGES} images · JPG, PNG</p>
                    </>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input placeholder="e.g. Branded Hard Hat" value={editDraft.name} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the item…" rows={3} value={editDraft.description} onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>

            {/* Variants management */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Variants</p>
              {(editingItem?.variants ?? []).length > 0 && (
                <div className="space-y-2">
                  {(editingItem?.variants ?? []).map((v) =>
                    editingVariantId === v.id ? (
                      <div key={v.id} className="rounded-lg border border-primary/40 bg-muted/20 p-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Size</Label>
                            <Input placeholder="e.g. M" value={variantEditDraft.size} onChange={(e) => setVariantEditDraft((p) => ({ ...p, size: e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Color</Label>
                            <Input placeholder="e.g. Red" value={variantEditDraft.color} onChange={(e) => setVariantEditDraft((p) => ({ ...p, color: e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Price ($) *</Label>
                            <Input type="number" min={0} placeholder="0.00" value={variantEditDraft.price} onChange={(e) => setVariantEditDraft((p) => ({ ...p, price: e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Stock</Label>
                            <Input type="number" min={0} placeholder="0" value={variantEditDraft.stock} onChange={(e) => setVariantEditDraft((p) => ({ ...p, stock: e.target.value }))} className="h-8 text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveVariantEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingVariantId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div key={v.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <span className="flex-1">{[v.productSize, v.productColor].filter(Boolean).join(" / ") || "—"}</span>
                        <span className="text-muted-foreground">${v.productPrice} · {v.productQuantity} in stock</span>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startVariantEdit(v)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeEditVariant(v.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )}
              <VariantInputRow draft={editVariantDraft} setDraft={setEditVariantDraft} onAdd={addEditVariant} label="Add new variant" />
            </div>

            <div className="flex gap-3">
              <Button onClick={saveEdit}>Save Changes</Button>
              <Button variant="outline" onClick={() => { setEditingId(null); setEditingVariantId(null); }}>Cancel</Button>
            </div>
          </div>
        );
      })()}

      {/* Item grid */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-10">Loading merchandise…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
                {item.images.length > 0 ? (
                  <img src={item.images[0].imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                )}
                {item.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                    +{item.images.length - 1}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <p className="font-semibold leading-tight">{item.productName}</p>
                {item.productDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.productDescription}</p>
                )}
                <div className="space-y-1">
                  {item.variants.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No variants added</p>
                  ) : (
                    item.variants.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
                        <span className="text-muted-foreground">{[v.productSize, v.productColor].filter(Boolean).join(" / ") || "—"}</span>
                        <span className="font-medium">{format(Number(v.productPrice))} · {v.productQuantity} in stock</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(item)}>Edit</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}>Remove</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="font-semibold">No merchandise yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add items to start selling branded products to your clients.</p>
        </div>
      )}
    </div>
  );
}

const RESPONSE_TIME_OPTIONS = [
  { label: "1 hour",   value: 1  },
  { label: "2 hours",  value: 2  },
  { label: "4 hours",  value: 4  },
  { label: "Same day", value: 8  },
  { label: "24 hours", value: 24 },
];

function SettingsView() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<EditProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [switchingToClient, setSwitchingToClient] = useState(false);
  const [confirmSwitchToClient, setConfirmSwitchToClient] = useState(false);
  useEffect(() => {
    fetchProProfileData().then((data) => {
      if (data) setProfileData(data);
    });
  }, []);

  async function handleSave() {
    if (!profileData) return;
    setSaving(true);
    try {
      await updateProProfileData(profileData);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount();
      toast.success("Account deleted");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setConfirmingDelete(false);
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleSwitchToClient() {
    if (!confirmSwitchToClient) {
      setConfirmSwitchToClient(true);
      return;
    }
    setSwitchingToClient(true);
    try {
      await switchToClientAccount();
      toast.success("Switched to client account. Please sign in as a client.");
      navigate({ to: "/client-login-signup" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch account");
      setConfirmSwitchToClient(false);
    } finally {
      setSwitchingToClient(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage your account preferences and settings</p>
        <Button onClick={handleSave} disabled={saving || !profileData}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Availability */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <LayoutDashboard className="h-4 w-4" />
            <h3 className="font-semibold">Profile Availability</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Visibility</Label>
              <select
                value={profileData?.profileVisibility ? "public" : "private"}
                onChange={(e) =>
                  setProfileData((prev) =>
                    prev ? { ...prev, profileVisibility: e.target.value === "public" } : prev
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Response Time</Label>
              <select
                value={profileData?.responseTime ?? 1}
                onChange={(e) =>
                  setProfileData((prev) =>
                    prev ? { ...prev, responseTime: Number(e.target.value) } : prev
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {RESPONSE_TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payment & Financial */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="h-4 w-4" />
            <h3 className="font-semibold">Payment & Financial</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Fee</Label>
              <div className="flex items-center gap-2">
                <Input value="12%" readOnly className="flex-1" />
                <Info className="h-4 w-4 text-muted-foreground shrink-0 cursor-help" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Processing</Label>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-500 rounded cursor-pointer" />
                <span className="text-sm font-medium flex-1">Stripe Payment Processing</span>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payout Methods</Label>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-500 rounded cursor-pointer" />
                <span className="text-sm font-medium flex-1">Payoneer Payouts</span>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </div>
            </div>
          </div>
        </div>

        {/* Switch Account */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4 w-4" />
            <h3 className="font-semibold">Switch Account</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">Switch to Client Account</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your pro profile will be deactivated and hidden from listings. You'll be signed out and must sign in again as a client.
              </p>
            </div>
            {confirmSwitchToClient && (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Are you sure? Click again to switch accounts.</p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSwitchToClient}
              disabled={switchingToClient}
            >
              {switchingToClient ? "Switching..." : confirmSwitchToClient ? "Yes, Switch to Client" : "Switch to Client Account"}
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Trash2 className="h-4 w-4" />
            <h3 className="font-semibold">Delete Account</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">Account Deletion</p>
              <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all associated data.</p>
            </div>
            {confirmingDelete && (
              <p className="text-sm text-red-500 font-medium">Are you sure? Click again to permanently delete your account.</p>
            )}
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white border-0"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Deleting..." : confirmingDelete ? "Yes, Delete My Account" : "Delete Account"}
            </Button>
          </div>
        </div>
      </div>

      {/* Account Security + Verification — half-width row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col items-center justify-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Account Verified</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your identity has been approved. Clients can book you with confidence.
            </p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20">
            Approved
          </Badge>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4" />
            <h3 className="font-semibold">Account Security</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">Password</p>
              <p className="text-sm text-muted-foreground mt-1">Update your account password to keep your account secure</p>
            </div>
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Upload Work ---------- */

function UploadWork({ tradeSpecialties }: { tradeSpecialties: string[] }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPortfolios()
      .then(setPortfolios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const remaining = MAX_MEDIA_PER_PORTFOLIO - files.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_MEDIA_PER_PORTFOLIO} files per portfolio`);
      return;
    }
    const toAdd = selected.slice(0, remaining);
    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setTitle("");
    setDescription("");
    setCategory("");
    setFiles([]);
    setPreviews([]);
    setShowForm(false);
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (files.length === 0) { toast.error("Upload at least one file"); return; }
    setSubmitting(true);
    try {
      const portfolio = await createPortfolio(title.trim(), description.trim(), category);
      for (const file of files) {
        const url = await uploadPortfolioMedia(file, portfolio.id);
        const media = await savePortfolioMediaUrl(portfolio.id, url);
        portfolio.media.push(media);
      }
      setPortfolios((prev) => [portfolio, ...prev]);
      resetForm();
      toast.success("Portfolio uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePortfolio(portfolio: Portfolio) {
    setDeletingId(portfolio.id);
    try {
      await deletePortfolio(portfolio);
      setPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id));
      toast.success("Portfolio deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteMedia(portfolioId: number, media: PortfolioMedia) {
    try {
      await deletePortfolioMedia(media.id, media.mediaUrl);
      setPortfolios((prev) =>
        prev.map((p) =>
          p.id === portfolioId ? { ...p, media: p.media.filter((m) => m.id !== media.id) } : p
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function startEdit(portfolio: Portfolio) {
    setEditingId(portfolio.id);
    setEditTitle(portfolio.title);
    setEditDescription(portfolio.description ?? "");
    setEditCategory(portfolio.category ?? "");
    setEditFiles([]);
    setEditPreviews([]);
  }

  function cancelEdit() {
    editPreviews.forEach((p) => URL.revokeObjectURL(p));
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditCategory("");
    setEditFiles([]);
    setEditPreviews([]);
  }

  function handleEditFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const portfolio = portfolios.find((p) => p.id === editingId);
    const currentCount = (portfolio?.media.length ?? 0) + editFiles.length;
    const remaining = MAX_MEDIA_PER_PORTFOLIO - currentCount;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_MEDIA_PER_PORTFOLIO} files per portfolio`);
      return;
    }
    const toAdd = Array.from(e.target.files ?? []).slice(0, remaining);
    setEditFiles((prev) => [...prev, ...toAdd]);
    setEditPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeEditFile(idx: number) {
    URL.revokeObjectURL(editPreviews[idx]);
    setEditFiles((prev) => prev.filter((_, i) => i !== idx));
    setEditPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleEditSubmit() {
    const portfolio = portfolios.find((p) => p.id === editingId);
    if (!portfolio) return;
    if (!editTitle.trim()) { toast.error("Title is required"); return; }
    setEditSubmitting(true);
    try {
      await updatePortfolio(portfolio.id, editTitle.trim(), editDescription.trim(), editCategory);
      const newMedia: PortfolioMedia[] = [];
      for (const file of editFiles) {
        const url = await uploadPortfolioMedia(file, portfolio.id);
        const media = await savePortfolioMediaUrl(portfolio.id, url);
        newMedia.push(media);
      }
      setPortfolios((prev) =>
        prev.map((p) =>
          p.id === portfolio.id
            ? { ...p, title: editTitle.trim(), description: editDescription.trim(), category: editCategory, media: [...p.media, ...newMedia] }
            : p
        )
      );
      cancelEdit();
      toast.success("Portfolio updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  }

  function isVideo(url: string) {
    return /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(url);
  }

  function isVideoFile(file: File) {
    return file.type.startsWith("video/");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">My Portfolios</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Showcase your completed work to clients</p>
        </div>
        <Button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="gap-2"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Portfolio"}
        </Button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">New Portfolio Entry</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Kitchen renovation — Brixton"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a specialty</option>
                {tradeSpecialties.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the project, materials used, challenges overcome…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* File upload area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Media <span className="text-muted-foreground font-normal">(images &amp; videos)</span></Label>
              <span className="text-xs text-muted-foreground">{files.length} / {MAX_MEDIA_PER_PORTFOLIO}</span>
            </div>

            {files.length < MAX_MEDIA_PER_PORTFOLIO && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors p-6 flex flex-col items-center gap-2 text-muted-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Click to upload photos or videos</span>
                <span className="text-xs">JPG, PNG, WEBP, MP4, MOV — up to {MAX_MEDIA_PER_PORTFOLIO} files</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                    {isVideoFile(files[idx]) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <Film className="h-6 w-6" />
                        <span className="text-[10px] px-1 truncate w-full text-center">{files[idx].name}</span>
                      </div>
                    ) : (
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={resetForm} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? "Uploading…" : "Save Portfolio"}
            </Button>
          </div>
        </div>
      )}

      {/* Portfolio grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : portfolios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p className="text-sm font-medium">No portfolios yet</p>
          <p className="text-xs">Click "New Portfolio" to upload your first piece of work</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
            >
              {/* Media preview grid */}
              <div className="grid grid-cols-3 gap-0.5 bg-muted" style={{ aspectRatio: "16/9" }}>
                {portfolio.media.slice(0, 5).map((m, idx) => (
                  <div
                    key={m.id}
                    className={`relative group bg-muted overflow-hidden ${idx === 0 ? "col-span-2 row-span-2" : ""}`}
                  >
                    {isVideo(m.mediaUrl) ? (
                      <video
                        src={m.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(portfolio.id, m)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {portfolio.media.length === 0 && (
                  <div className="col-span-3 flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-8 w-8 opacity-40" />
                  </div>
                )}
              </div>

              {/* Card body — normal view or inline edit form */}
              {editingId === portfolio.id ? (
                <div className="p-4 flex flex-col gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Specialty</Label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">None</option>
                      {tradeSpecialties.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="text-sm resize-none" />
                  </div>

                  {/* Add more media */}
                  {portfolio.media.length + editFiles.length < MAX_MEDIA_PER_PORTFOLIO && (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors py-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Add files ({portfolio.media.length + editFiles.length}/{MAX_MEDIA_PER_PORTFOLIO})
                    </button>
                  )}
                  {editPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {editPreviews.map((src, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                          {isVideoFile(editFiles[idx]) ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ) : (
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeEditFile(idx)}
                            className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={cancelEdit} disabled={editSubmitting} className="flex-1">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleEditSubmit} disabled={editSubmitting} className="flex-1 gap-1.5">
                      {editSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{portfolio.title}</p>
                      {portfolio.category && (
                        <Badge variant="secondary" className="mt-1 text-xs">{portfolio.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(portfolio)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit portfolio"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePortfolio(portfolio)}
                        disabled={deletingId === portfolio.id}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete portfolio"
                      >
                        {deletingId === portfolio.id
                          ? <RefreshCw className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>
                  {portfolio.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{portfolio.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-auto pt-1">
                    {portfolio.media.length} file{portfolio.media.length !== 1 ? "s" : ""} · {new Date(portfolio.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input for edit mode */}
      <input
        ref={editFileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleEditFilesSelected}
      />
    </div>
  );
}

const TESTIMONIAL_STATUS_META = {
  pending:  { label: "Pending review", icon: Clock,  classes: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  approved: { label: "Approved",       icon: Check,  classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Not accepted",   icon: X,      classes: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
};

function Testimonials({ proName }: { proName: string }) {
  const [testimonials, setTestimonials] = useState<VideoTestimonialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ description: "", videoFile: null as File | null });
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoTestimonialRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMyTestimonials()
      .then(setTestimonials)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load testimonials."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.videoFile) return;
    setUploading(true);
    setSubmitError(null);
    try {
      const videoUrl = await uploadTestimonialVideo(form.videoFile);
      const record = await submitTestimonial({
        name: proName,
        userType: "Tradesperson",
        description: form.description,
        videoUrl,
      });
      setTestimonials((prev) => [record, ...prev]);
      setForm({ description: "", videoFile: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setModalOpen(false);
      toast.success("Testimonial submitted for review.");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTestimonial(deleteTarget.id, deleteTarget.videoUrl);
      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Testimonial deleted.");
    } catch {
      toast.error("Failed to delete testimonial.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Upload video testimonials for the public Reviews page. Approved testimonials go live automatically.
        </p>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload testimonial
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {loadError}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
          <Film className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No testimonials yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Click "Upload testimonial" to share your story.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map((t) => {
            const meta = TESTIMONIAL_STATUS_META[t.status];
            const Icon = meta.icon;
            return (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-start"
              >
                <div className="aspect-video w-full sm:w-48 flex-shrink-0 overflow-hidden rounded-xl bg-black">
                  <video src={t.videoUrl} controls className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.userType}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.classes}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">"{t.description}"</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Submitted {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-500/10 hover:text-red-600"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">Upload a video testimonial</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Share your TradeHub experience on camera. Approved testimonials appear on the public Reviews page.
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label>Your name</Label>
              <Input readOnly value={proName} className="cursor-default bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                Tradesperson
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pro-t-desc">Brief description</Label>
              <Textarea
                id="pro-t-desc"
                placeholder="Summarise what you'll talk about in your video..."
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pro-t-file">Video file</Label>
              <label
                htmlFor="pro-t-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-amber-500 hover:text-foreground"
              >
                <Upload className="h-6 w-6" />
                {form.videoFile ? form.videoFile.name : "Click to choose a video file"}
                <input
                  ref={fileInputRef}
                  id="pro-t-file"
                  type="file"
                  accept="video/*"
                  required
                  className="sr-only"
                  onChange={(e) => setForm({ ...form, videoFile: e.target.files?.[0] ?? null })}
                />
              </label>
              <p className="text-xs text-muted-foreground">MP4, MOV, or WebM recommended. Max 500 MB.</p>
            </div>
            {submitError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {submitError}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold"
                disabled={uploading || !form.videoFile}
              >
                {uploading ? (
                  <><Upload className="mr-2 h-4 w-4 animate-bounce" />Uploading…</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Submit</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your video testimonial. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-600"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
