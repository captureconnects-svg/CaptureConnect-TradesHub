import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { fetchContactRequests, markContactRequestReplied, type ContactRequest } from "@/backend/contact";
import {
  checkAdminAuth,
  adminSignOut,
  fetchAdminQuickStats,
  fetchAdminRecentActivity,
  fetchAdminTopTradespeople,
  fetchAdminLoyalClients,
  fetchAdminBookings,
  deleteAdminBooking,
  updateAdminBookingStatus,
  fetchAdminReviews,
  deleteAdminReview,
  fetchAdminOrders,
  deleteAdminOrder,
  issueOrderRefund,
  issueBookingRefund,
  fetchAllConversations,
  fetchAllMerchandise,
  fetchAllVerifications,
  fetchAllTestimonials,
  fetchAllLikes,
  fetchAllUsers,
  createAdminUser,
  deleteAdminUser,
  toggleUserSuspension,
  updateAdminUser,
  fetchAdminTestimonials,
  updateTestimonialStatus,
  fetchAdminVerifications,
  updateVerificationStatus,
  fetchVerificationDocuments,
  getAdminEmail,
  fetchAuditLogs,
  fetchSecurityMetrics,
  fetchSuspendedUsers,
  getAdminSettings,
  saveAdminSettings,
  getAdminLoginHistory,
  updateAdminPassword,
  fetchAdminProBankDetails,
  allocatePayoutReceiptNumbers,
  confirmPayoutTransfer,
  fetchAdminPayoutReceipts,
  type AdminProBankDetails,
  type PayoutReceiptAdminRecord,
  type AdminQuickStats,
  type AdminActivityItem,
  type AdminTopPro,
  type AdminLoyalClient,
  type AdminUser,
  type AdminBooking,
  type AdminOrder,
  type AdminReview,
  type AdminTestimonial,
  type AdminVerification,
  type VerificationDocument,
  type AuditLogEntry,
  type SecurityMetrics,
  type AdminSettings,
  type AdminLoginRecord,
} from "@/backend/admin";
import { fetchAdminReturnRequests, fetchReturnEvidence, type AdminReturnRequest } from "@/backend/return-requests";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
  type PlatformSettingsInput,
} from "@/lib/settings/platformSettings";
import { fetchSettingsHistory, type SettingsHistoryEntry } from "@/lib/settings/settingsHistory";
import { fetchPayments, fetchPaymentById, fetchPaymentsByIds, type PaymentFilters } from "@/lib/payments/ledger";
import { fetchFinancialReport, fetchProFinancialReport, type FinancialReport, type ProFinancialRow } from "@/lib/payments/reports";
import { fetchReadyPayouts, releasePayout, releaseManualPayout, setTransferFee } from "@/lib/payments/payouts";
import { fetchUnverifiedPayments, retryReconciliation } from "@/lib/payments/reconciliation";
import { fetchConnectStatus } from "@/lib/payments/stripeConnect";
import { buildPayoutReceiptData, generatePayoutReceiptPdf } from "@/lib/payments/receiptPdf";
import { getPayoutLabel, type Payment, type TradespersonStripeAccount } from "@/lib/payments/types";
import { CurrencySelect, useCurrency } from "@/lib/currency";
import {
  Shield,
  LayoutDashboard,
  Users,
  Hammer,
  CalendarCheck,
  Star,
  ShoppingBag,
  MessageSquare,
  Package,
  BadgeCheck,
  Film,
  Heart,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
  Eye,
  Search,
  CreditCard,
  Trash2,
  UserPlus,
  Ban,
  ShieldCheck,
  Pencil,
  MapPin,
  CalendarDays,
  Briefcase,
  Clock,
  Timer,
  ExternalLink,
  Link2,
  XCircle,
  Truck,
  CheckCircle,
  FileText,
  ScrollText,
  Settings,
  ShieldAlert,
  Download,
  KeyRound,
  Mail,
  MailOpen,
  Send,
  DollarSign,
  Receipt,
  BarChart3,
  Wallet,
  ShieldQuestion,
  Landmark,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/lib/theme";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/mgmt-3d856e45")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — Capture Connect" }],
  }),
  component: AdminDashboardPage,
});

type View =
  | "overview"
  | "users"
  | "bookings"
  | "orders"
  | "refund-requests"
  | "reviews"
  | "verifications"
  | "testimonials"
  | "audit-logs"
  | "admin-settings"
  | "platform-settings"
  | "security-overview"
  | "contact-requests"
  | "payments"
  | "reports";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "payments", label: "Payments", icon: Receipt },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "refund-requests", label: "Refund Requests", icon: RefreshCw },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "verifications", label: "Verifications", icon: BadgeCheck },
  { id: "testimonials", label: "Testimonials", icon: Film },
  { id: "contact-requests", label: "Contact Requests", icon: Mail },
];

const AUDIT_NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "audit-logs", label: "Logs", icon: ScrollText },
  { id: "security-overview", label: "Security Overview", icon: ShieldAlert },
  { id: "platform-settings", label: "Payment Settings", icon: DollarSign },
  { id: "admin-settings", label: "Settings", icon: Settings },
];

function AdminDashboardPage() {
  const [view, setView] = useState<View>("overview");
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth().then((ok) => {
      setAuthState(ok ? "ok" : "denied");
      if (!ok) navigate({ to: "/mgmt-7e04a265" });
    });
  }, []);

  async function handleLogout() {
    await adminSignOut();
    navigate({ to: "/mgmt-7e04a265" });
  }

  if (authState !== "ok") return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
                Admin
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
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

            <SidebarGroup>
              <SidebarGroupLabel>Admin Audit</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {AUDIT_NAV.map((item) => (
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
                <SidebarMenuButton onClick={handleLogout} tooltip="Log out">
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
                {[...NAV, ...AUDIT_NAV].find((n) => n.id === view)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <CurrencySelect className="hidden sm:flex" />
              <ThemeToggle />
              <Badge variant="secondary" className="hidden sm:flex gap-1">
                <Shield className="h-3 w-3" /> Admin
              </Badge>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
            {view === "overview" && <Overview />}
            {view === "users" && <UserManagementView />}
            {view === "bookings" && <AdminBookingsView />}
            {view === "reviews" && <AdminReviewsView />}
            {view === "orders" && <AdminOrdersView />}
            {view === "payments" && <AdminPaymentsView />}
            {view === "reports" && <AdminReportsView />}
            {view === "verifications" && <AdminVerificationsView />}
            {view === "testimonials" && <AdminTestimonialsView />}
            {view === "audit-logs" && <AdminAuditLogsView />}
            {view === "admin-settings" && <AdminSettingsView />}
            {view === "platform-settings" && <PlatformSettingsView />}
            {view === "security-overview" && <AdminSecurityOverviewView />}
            {view === "refund-requests" && <AdminRefundRequestsView />}
            {view === "contact-requests" && <AdminContactRequestsView />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Overview() {
  const adminEmail = getAdminEmail() ?? "admin@tradehub.com";
  const [quickStats, setQuickStats] = useState<AdminQuickStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [topPros, setTopPros] = useState<AdminTopPro[]>([]);
  const [loyalClients, setLoyalClients] = useState<AdminLoyalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [quickStatsData, activityData, topProsData, loyalClientsData] =
        await Promise.all([
          fetchAdminQuickStats(),
          fetchAdminRecentActivity(20),
          fetchAdminTopTradespeople(5),
          fetchAdminLoyalClients(5),
        ]);
      setQuickStats(quickStatsData);
      setActivity(activityData);
      setTopPros(topProsData);
      setLoyalClients(loyalClientsData);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  async function silentRefresh() {
    try {
      const [quickStatsData, activityData, topProsData, loyalClientsData] =
        await Promise.all([
          fetchAdminQuickStats(),
          fetchAdminRecentActivity(20),
          fetchAdminTopTradespeople(5),
          fetchAdminLoyalClients(5),
        ]);
      setQuickStats(quickStatsData);
      setActivity(activityData);
      setTopPros(topProsData);
      setLoyalClients(loyalClientsData);
      setLastRefreshed(new Date());
    } catch {}
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_bookings" }, silentRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_activity" }, silentRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_profiles" }, silentRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tradesperson_profiles" }, silentRefresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <LoadingSkeleton rows={4} cols={3} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      {/* Admin greeting */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {getGreeting()}, Admin
          </p>
          <p className="text-xs text-muted-foreground">{adminEmail}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Last updated {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* 2-column panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto flex-1">
            {activity.length === 0 ? (
              <p className="px-5 py-10 text-sm text-muted-foreground text-center">No recent activity</p>
            ) : (
              activity.map((item) => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl border border-border bg-card flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Quick Stats</h3>
          </div>
          <div className="p-5 space-y-3 flex-1">
            <QuickStatRow
              icon={CalendarCheck}
              label="Total Active Bookings"
              value={quickStats?.activeBookings ?? 0}
              color="text-blue-500"
              bg="bg-blue-50 dark:bg-blue-950/30"
            />
            <QuickStatRow
              icon={CalendarCheck}
              label="Bookings Today"
              value={quickStats?.bookingsToday ?? 0}
              color="text-green-500"
              bg="bg-green-50 dark:bg-green-950/30"
            />
            <QuickStatRow
              icon={Hammer}
              label="New Tradespeople (30d)"
              value={quickStats?.newTradespeople ?? 0}
              color="text-purple-500"
              bg="bg-purple-50 dark:bg-purple-950/30"
            />
            <QuickStatRow
              icon={Users}
              label="New Clients (30d)"
              value={quickStats?.newClients ?? 0}
              color="text-orange-500"
              bg="bg-orange-50 dark:bg-orange-950/30"
            />
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">System Status</span>
              </div>
              <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                Healthy
              </span>
            </div>
          </div>
        </div>

        {/* Most Popular Tradespeople */}
        <div className="rounded-xl border border-border bg-card flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Most Popular Tradespeople</h3>
          </div>
          <div className="divide-y divide-border flex-1">
            {topPros.length === 0 ? (
              <p className="px-5 py-10 text-sm text-muted-foreground text-center">No data yet</p>
            ) : (
              topPros.map((pro, i) => (
                <div
                  key={pro.id}
                  className={`flex items-center gap-3 px-5 py-3 ${i === 0 ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pro.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${i === 0 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                      {pro.name}
                    </p>
                    <p className="text-xs text-muted-foreground">@{pro.username || pro.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="h-3 w-3" /> {pro.bookingCount} bookings
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" /> {pro.reviewCount} reviews
                    </span>
                    {pro.avgRating > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-3 w-3 fill-yellow-400" /> {pro.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Loyal Customers */}
        <div className="rounded-xl border border-border bg-card flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Most Loyal Customers</h3>
          </div>
          <div className="divide-y divide-border flex-1">
            {loyalClients.length === 0 ? (
              <p className="px-5 py-10 text-sm text-muted-foreground text-center">No data yet</p>
            ) : (
              loyalClients.map((client, i) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-5 py-3 ${i === 0 ? "bg-green-50/60 dark:bg-green-950/20" : ""}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${i === 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                      {client.name}
                    </p>
                    <p className="text-xs text-muted-foreground">@{client.username || client.name}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <CalendarCheck className="h-3 w-3" />
                    {client.bookingCount} {client.bookingCount === 1 ? "booking" : "bookings"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview helper components ────────────────────────────────────────────────

const ACTIVITY_ICON_MAP: Record<string, typeof Activity> = {
  profile_view: Eye,
  booking: CalendarCheck,
  message: MessageSquare,
  review: Star,
  payment: CreditCard,
  order: ShoppingBag,
  like: Heart,
};

function ActivityRow({ item }: { item: AdminActivityItem }) {
  const Icon = ACTIVITY_ICON_MAP[item.activityType] ?? Activity;
  const date = new Date(item.createdAt);
  const label = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">to: {item.tradespersonName}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    </div>
  );
}

function QuickStatRow({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${bg}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── User Profile Dialog ──────────────────────────────────────────────────────

function UserProfileDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: (updated: AdminUser) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setUsername(user.username);
      setEmail(user.email);
      setEditing(false);
      setError(null);
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    if (!fullName.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateAdminUser(user.id, user.type, {
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
      });
      onSaved({ ...user, fullName: fullName.trim(), username: username.trim(), email: email.trim() });
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!user) return;
    setFullName(user.fullName);
    setUsername(user.username);
    setEmail(user.email);
    setError(null);
    setEditing(false);
  }

  const avatarColor = user?.type === "Pro"
    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

  return (
    <Dialog open={!!user} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          {/* Avatar + name + type badge */}
          <DialogTitle className="flex items-center gap-3">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.fullName}
                loading="lazy"
                decoding="async"
                className="h-12 w-12 rounded-full object-cover shrink-0 ring-2 ring-border"
              />
            ) : (
              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
                {user?.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="truncate">{user?.fullName}</span>
                <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0 ${avatarColor}`}>
                  {user?.type === "Pro" ? "Tradesperson" : "Client"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    user?.status === "Active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : user?.status === "Suspended"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : user?.status === "Deactivated"
                          ? "bg-muted text-muted-foreground"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {user?.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  Joined{" "}
                  {user &&
                    new Date(user.joinDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              {/* ID */}
              <ProfileRow label="User ID">
                <span className="font-mono text-xs truncate text-muted-foreground" title={user?.id}>
                  {user?.id}
                </span>
              </ProfileRow>
              {/* Name */}
              <ProfileRow label="Full Name">
                <span className="font-medium">{user?.fullName}</span>
              </ProfileRow>
              {/* Username */}
              <ProfileRow label="Username">
                <span>{user?.username || "—"}</span>
              </ProfileRow>
              {/* Email */}
              <ProfileRow label="Email">
                <span className="truncate">{user?.email}</span>
              </ProfileRow>
              {/* DOB */}
              <ProfileRow label="Date of Birth">
                {user?.dob ? (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {new Date(user.dob).toLocaleDateString(undefined, {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 italic text-xs">Not provided</span>
                )}
              </ProfileRow>
              {/* Location */}
              <ProfileRow label="Location">
                {user?.location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {user.location}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 italic text-xs">Not provided</span>
                )}
              </ProfileRow>
              {/* Pro-only fields */}
              {user?.type === "Pro" && (
                <>
                  <ProfileRow label="Experience">
                    {user.yearsOfExperience != null ? (
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {user.yearsOfExperience} {user.yearsOfExperience === 1 ? "year" : "years"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic text-xs">Not provided</span>
                    )}
                  </ProfileRow>
                  <div className="flex items-start px-4 py-2.5 gap-3">
                    <span className="w-28 text-muted-foreground shrink-0 mt-0.5">Specialties</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.specialties && user.specialties.length > 0 ? (
                        user.specialties.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-0.5 text-xs font-medium"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs">None set</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => setEditing(true)} className="gap-2">
                <Pencil className="h-3.5 w-3.5" /> Edit Account
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-2.5 gap-3">
      <span className="w-28 text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="flex-1 min-w-0 text-sm">{children}</span>
    </div>
  );
}

// ─── User Management View ─────────────────────────────────────────────────────

const USER_PAGE_SIZE = 15;

function UserManagementView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Client" | "Pro">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Suspended" | "Deleted">("All");
  const [page, setPage] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchAllUsers());
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Delete ${user.fullName}? This cannot be undone.`)) return;
    setDeletingId(user.id);
    try {
      await deleteAdminUser(user.id, user.type);
      // Keep the user in the list so the admin sees the Deleted status immediately.
      // They will also appear on next refresh via deleted_accounts.
      setUsers((prev) =>
        prev.map((u) => u.id === user.id && u.type === user.type ? { ...u, status: "Deleted" } : u),
      );
    } catch (e: any) {
      alert(e.message ?? "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleSuspend(user: AdminUser) {
    const suspending = user.status !== "Suspended";
    const verb = suspending ? "Suspend" : "Unsuspend";
    if (!confirm(`${verb} ${user.fullName}?`)) return;
    setSuspendingId(user.id);
    try {
      await toggleUserSuspension(user.id, suspending, user.type);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, status: suspending ? "Suspended" : "Active" }
            : u,
        ),
      );
    } catch (e: any) {
      alert(e.message ?? `Failed to ${verb.toLowerCase()} user`);
    } finally {
      setSuspendingId(null);
    }
  }

  const allCount = users.length;
  const proCount = users.filter((u) => u.type === "Pro").length;
  const clientCount = users.filter((u) => u.type === "Client").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;
  const deletedCount = users.filter((u) => u.status === "Deleted").length;

  const filtered = users.filter((u) => {
    if (typeFilter !== "All" && u.type !== typeFilter) return false;
    if (statusFilter !== "All" && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / USER_PAGE_SIZE);
  const pageRows = filtered.slice(page * USER_PAGE_SIZE, (page + 1) * USER_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={6} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage all users across the platform</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "All Users", value: allCount, color: "text-blue-600 dark:text-blue-400" },
          { label: "Tradespeople", value: proCount, color: "text-purple-600 dark:text-purple-400" },
          { label: "Clients", value: clientCount, color: "text-orange-600 dark:text-orange-400" },
          { label: "Suspended", value: suspendedCount, color: "text-red-600 dark:text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search users…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v as "All" | "Client" | "Pro"); setPage(0); }}
        >
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Users</SelectItem>
            <SelectItem value="Client">Clients</SelectItem>
            <SelectItem value="Pro">Tradespeople</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as "All" | "Active" | "Suspended" | "Deleted"); setPage(0); }}
        >
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
            <SelectItem value="Deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Name", "Username", "Email", "Type", "Status", "Join Date", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((user) => (
                  <tr
                    key={`${user.type}-${user.id}`}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{user.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {user.username || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.type === "Pro"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {user.type === "Pro" ? "Tradesperson" : "Client"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : user.status === "Suspended"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : user.status === "Deactivated"
                                ? "bg-muted text-muted-foreground"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(user.joinDate).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingUser(user)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="View profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(user)}
                          disabled={suspendingId === user.id || user.status === "Deleted"}
                          className={`h-7 w-7 rounded border flex items-center justify-center transition-colors disabled:opacity-50 ${
                            user.status === "Suspended"
                              ? "border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                              : "border-border text-muted-foreground hover:text-amber-600 hover:border-amber-400 dark:hover:text-amber-400"
                          }`}
                          title={user.status === "Suspended" ? "Unsuspend account" : "Suspend account"}
                        >
                          {user.status === "Suspended"
                            ? <ShieldCheck className="h-3.5 w-3.5" />
                            : <Ban className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id || user.status === "Deleted"}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
                          title={user.status === "Deleted" ? "Account already deleted" : "Delete user"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} users
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AddUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={() => { setShowAddDialog(false); load(); }}
      />

      <UserProfileDialog
        user={viewingUser}
        onClose={() => setViewingUser(null)}
        onSaved={(updated: AdminUser) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id && u.type === updated.type ? updated : u)));
          setViewingUser(updated);
        }}
      />
    </div>
  );
}

// ─── Add User Dialog ───────────────────────────────────────────────────────────

function AddUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"Client" | "Pro">("Client");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setPassword("");
    setUserType("Client");
    setError(null);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createAdminUser({ fullName: fullName.trim(), email: email.trim(), password, type: userType });
      reset();
      onCreated();
    } catch (e: any) {
      setError(e.message ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Add New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-fullname">Full Name</Label>
            <Input
              id="add-fullname"
              placeholder="e.g. Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-password">Password</Label>
            <Input
              id="add-password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>User Type</Label>
            <Select value={userType} onValueChange={(v) => setUserType(v as "Client" | "Pro")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Client">Client</SelectItem>
                <SelectItem value="Pro">Tradesperson (Pro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false); }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating…</>
              ) : (
                <><UserPlus className="h-3.5 w-3.5" /> Create User</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Bookings View ──────────────────────────────────────────────────────

const BOOKING_STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  confirmed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function AdminBookingDetailDialog({
  booking,
  onClose,
}: {
  booking: AdminBooking | null;
  onClose: () => void;
}) {
  if (!booking) return null;

  const shortId = booking.id.slice(0, 8);
  const dateDisplay = booking.date
    ? new Date(booking.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
    : "—";
  const [h = 0, m = 0] = (booking.time ?? "00:00").split(":").map(Number);
  const timeDisplay = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const createdDisplay = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
    : "—";
  const updatedDisplay = booking.updatedAt
    ? new Date(booking.updatedAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
    : "—";
  const serviceLinkUploadDate = booking.updatedAt
    ? new Date(booking.updatedAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
    : null;

  return (
    <Dialog open={!!booking} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Booking Details</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete information for booking {shortId}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-0">
          <div className="rounded-lg border border-border divide-y divide-border text-sm">
            <BookingDetailRow label="Booking ID">
              <span className="font-mono text-xs text-muted-foreground break-all">{booking.id}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Reference">
              <span className="text-muted-foreground">N/A</span>
            </BookingDetailRow>
            <BookingDetailRow label="Client Name">
              <span className="font-medium">{booking.clientName}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Tradesperson">
              <span className="font-medium">{booking.tradespersonName}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Email">
              <span className="truncate">{booking.clientEmail || "—"}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Phone">
              <span>{booking.clientPhone || "—"}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Date">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {dateDisplay}
              </span>
            </BookingDetailRow>
            <BookingDetailRow label="Time">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {timeDisplay}
              </span>
            </BookingDetailRow>
            <BookingDetailRow label="Location">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {booking.location || "—"}
              </span>
            </BookingDetailRow>
            <BookingDetailRow label="Session Type">
              <span>{booking.service || "—"}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Duration">
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {booking.duration > 0
                  ? `${booking.duration} hour${booking.duration !== 1 ? "s" : ""}`
                  : "N/A"}
              </span>
            </BookingDetailRow>
            <BookingDetailRow label="Amount">
              <span className="font-semibold">${booking.totalPrice.toFixed(2)}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Booking Status">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BOOKING_STATUS_COLORS[booking.status] ?? "bg-muted text-muted-foreground"}`}
              >
                {booking.status}
              </span>
            </BookingDetailRow>
            <BookingDetailRow label="Payment Status">
              <div className="space-y-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    booking.paymentStatus === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus ?? "Unpaid"}
                </span>
                {booking.paymentStatus === "paid" && (
                  <p className="text-xs text-muted-foreground">From payments subcollection</p>
                )}
              </div>
            </BookingDetailRow>
            <BookingDetailRow label="Refund Status">
              {booking.refunded || booking.returnRequestStatus === "refunded" ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  Refunded
                </span>
              ) : booking.returnRequestId ? (
                booking.returnRequestStatus === "pro_approved" ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Requested
                  </span>
                )
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </BookingDetailRow>
            <BookingDetailRow label="Created At">
              <span className="text-muted-foreground">{createdDisplay}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Updated At">
              <span className="text-muted-foreground">{updatedDisplay}</span>
            </BookingDetailRow>
          </div>

          {booking.serviceLink && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1.5">Service Link</p>
              <a
                href={booking.serviceLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 hover:bg-muted/70 transition-colors"
              >
                <Link2 className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 text-sm text-primary truncate">.</span>
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
              </a>
              {serviceLinkUploadDate && (
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  Uploaded: {serviceLinkUploadDate}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 pt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingDetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-2.5 gap-3">
      <span className="w-32 text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="flex-1 min-w-0 text-sm">{children}</span>
    </div>
  );
}

function AdminBookingEditDialog({
  booking,
  onClose,
  onSaved,
}: {
  booking: AdminBooking | null;
  onClose: () => void;
  onSaved: (id: string, status: string) => void;
}) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      setStatus(booking.status);
      setError(null);
    }
  }, [booking]);

  async function handleSave() {
    if (!booking) return;
    setSaving(true);
    setError(null);
    try {
      await updateAdminBookingStatus(booking.id, status);
      onSaved(booking.id, status);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to update booking");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!booking} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Booking
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 space-y-3">
          <div className="space-y-1.5">
            <Label>Booking Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["pending", "confirmed", "completed", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BOOKING_PAGE_SIZE = 20;

function AdminBookingsView() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(0);
  const [viewingBooking, setViewingBooking] = useState<AdminBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<AdminBooking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBookings(await fetchAdminBookings());
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(booking: AdminBooking) {
    if (!confirm(`Delete booking ${booking.id.slice(0, 8)}? This cannot be undone.`)) return;
    setDeletingId(booking.id);
    try {
      await deleteAdminBooking(booking.id);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (e: any) {
      alert(e.message ?? "Failed to delete booking");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefund(booking: AdminBooking) {
    if (!confirm(`Issue refund for booking ${booking.id.slice(0, 8)}? This cannot be undone.`)) return;
    setRefundingId(booking.id);
    try {
      await issueBookingRefund(booking.id);
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, refunded: true } : b));
    } catch (e: any) {
      alert(e.message ?? "Failed to issue refund");
    } finally {
      setRefundingId(null);
    }
  }

  const totalCount = bookings.length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const pendingRefundCount = bookings.filter((b) => b.status === "cancelled" && !b.refunded).length;

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "All Status" && b.status !== statusFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.tradespersonName.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / BOOKING_PAGE_SIZE);
  const pageRows = filtered.slice(page * BOOKING_PAGE_SIZE, (page + 1) * BOOKING_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={7} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Bookings" value={totalCount} color="text-blue-600 dark:text-blue-400" icon={CalendarCheck} iconColor="text-blue-500" />
        <StatCard label="Completed" value={completedCount} color="text-green-600 dark:text-green-400" icon={ShieldCheck} iconColor="text-green-500" />
        <StatCard label="Cancelled" value={cancelledCount} color="text-red-600 dark:text-red-400" icon={XCircle} iconColor="text-red-500" />
        <StatCard label="Confirmed" value={confirmedCount} color="text-purple-600 dark:text-purple-400" icon={Clock} iconColor="text-purple-500" />
        <StatCard label="Refund Pending" value={pendingRefundCount} color="text-amber-600 dark:text-amber-400" icon={RefreshCw} iconColor="text-amber-500" />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(0); }}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All Status", "Pending", "Confirmed", "Completed", "Cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* All Bookings header */}
      <div>
        <h2 className="text-base font-semibold">All Bookings</h2>
        <p className="text-xs text-muted-foreground">
          {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No bookings found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Booking ID", "Client", "Tradesperson", "Date", "Time", "Amount", "Status", "Payment", "Refunded", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((booking) => {
                  const [bh = 0, bm = 0] = (booking.time ?? "00:00").split(":").map(Number);
                  const timeDisplay = `${String(bh).padStart(2, "0")}:${String(bm).padStart(2, "0")}`;
                  const dateDisplay = booking.date
                    ? new Date(booking.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
                    : "—";

                  return (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                        {booking.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{booking.clientName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{booking.tradespersonName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{dateDisplay}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{timeDisplay}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        ${booking.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BOOKING_STATUS_COLORS[booking.status] ?? "bg-muted text-muted-foreground"}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {booking.paymentStatus === "paid" ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Paid
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {booking.refunded || booking.returnRequestStatus === "refunded" ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Refunded
                          </span>
                        ) : booking.returnRequestId ? (
                          booking.returnRequestStatus === "pro_approved" ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Requested
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingBooking(booking)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                            title="View booking details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingBooking(booking)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            title="Edit booking"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {booking.status === "cancelled" && booking.paymentStatus === "paid" && !booking.refunded && booking.returnRequestStatus !== "refunded" && (
                            <button
                              onClick={() => handleRefund(booking)}
                              disabled={refundingId === booking.id}
                              className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-green-600 hover:border-green-400 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                              title="Issue refund"
                            >
                              {refundingId === booking.id
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <CreditCard className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(booking)}
                            disabled={deletingId === booking.id}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
                            title="Delete booking"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} bookings
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AdminBookingDetailDialog
        booking={viewingBooking}
        onClose={() => setViewingBooking(null)}
      />
      <AdminBookingEditDialog
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSaved={(id, status) => {
          setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
          setEditingBooking(null);
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof CalendarCheck;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Admin Payments View ──────────────────────────────────────────────────────

const PAYMENT_PAGE_SIZE = 20;

function money(value: number | null | undefined): string {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const styles: Record<Payment["status"], string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    succeeded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    refunded: "bg-muted text-muted-foreground",
    partially_refunded: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function AdminPaymentsView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [readyPayoutCount, setReadyPayoutCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Payment["status"]>("All");
  const [page, setPage] = useState(0);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [feePayment, setFeePayment] = useState<Payment | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [all, unverified, ready] = await Promise.all([
        fetchPayments({ limit: 500 }),
        fetchUnverifiedPayments(),
        fetchReadyPayouts(),
      ]);
      setPayments(all);
      setUnverifiedCount(unverified.length);
      setReadyPayoutCount(ready.length);
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRetryAll() {
    setRetryingAll(true);
    setRetryMessage(null);
    try {
      const result = await retryReconciliation();
      setRetryMessage(`Checked ${result.checked}, reconciled ${result.reconciled}, still failing ${result.stillFailing}.`);
      await load();
    } catch (e: any) {
      setRetryMessage(e.message ?? "Retry failed.");
    } finally {
      setRetryingAll(false);
    }
  }

  const succeededCount = payments.filter((p) => p.status === "succeeded").length;
  const refundedCount = payments.filter((p) => p.status === "refunded" || p.status === "partially_refunded").length;

  const filtered = payments.filter((p) => {
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.stripe_payment_intent_id.toLowerCase().includes(q) ||
        (p.booking_id ?? "").toLowerCase().includes(q) ||
        String(p.order_id ?? "").includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAYMENT_PAGE_SIZE);
  const pageRows = filtered.slice(page * PAYMENT_PAGE_SIZE, (page + 1) * PAYMENT_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={7} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Payments" value={payments.length} color="text-blue-600 dark:text-blue-400" icon={Receipt} iconColor="text-blue-500" />
        <StatCard label="Succeeded" value={succeededCount} color="text-green-600 dark:text-green-400" icon={CheckCircle} iconColor="text-green-500" />
        <StatCard label="Awaiting Reconciliation" value={unverifiedCount} color="text-yellow-600 dark:text-yellow-400" icon={ShieldQuestion} iconColor="text-yellow-500" />
        <StatCard label="Ready for Payout" value={readyPayoutCount} color="text-purple-600 dark:text-purple-400" icon={Wallet} iconColor="text-purple-500" />
      </div>

      {unverifiedCount > 0 && (
        <div className="rounded-xl border border-yellow-300/50 bg-yellow-50 dark:bg-yellow-900/10 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <ShieldQuestion className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <span>
              <strong>{unverifiedCount}</strong> payment{unverifiedCount !== 1 ? "s" : ""} still awaiting exact Stripe fee reconciliation.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {retryMessage && <span className="text-xs text-muted-foreground">{retryMessage}</span>}
            <Button variant="outline" size="sm" onClick={handleRetryAll} disabled={retryingAll} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${retryingAll ? "animate-spin" : ""}`} /> Retry All
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search by payment id, PaymentIntent, booking/order id…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0); }}>
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "pending", "succeeded", "failed", "refunded", "partially_refunded"].map((s) => (
              <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No payments found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Date", "Reference", "Amount", "Status", "Fee Verified", "Payout", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {p.booking_id ? `Booking ${p.booking_id.slice(0, 8)}` : `Order #${p.order_id}`}
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{money(p.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {p.stripe_fee_verified ? (
                        <span className="text-green-600 dark:text-green-400 text-xs font-medium">Verified</span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const { text, tone } = getPayoutLabel(p);
                        const toneClass =
                          tone === "released"
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : tone === "failed"
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : tone === "escrow"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : "text-muted-foreground";
                        return <span className={cn("text-xs", toneClass)}>{text}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingPayment(p)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="View payment details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {p.payout_status === "released" && (
                          <button
                            onClick={() => setFeePayment(p)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                            title={p.transfer_fees != null ? "Edit transfer fee" : "Add transfer fee"}
                          >
                            <Landmark className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <PaymentDetailDialog
        payment={viewingPayment}
        onClose={() => setViewingPayment(null)}
        onChanged={load}
      />
      <TransferFeeDialog
        payment={feePayment}
        onClose={() => setFeePayment(null)}
        onChanged={load}
      />
    </div>
  );
}

function PaymentDetailDialog({
  payment,
  onClose,
  onChanged,
}: {
  payment: Payment | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState<Payment | null>(payment);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(payment);
    setActionError(null);
  }, [payment]);

  if (!payment || !current) return null;

  async function refresh() {
    const fresh = await fetchPaymentById(payment!.id);
    setCurrent(fresh);
    onChanged();
  }

  async function handleRetry() {
    setBusy(true);
    setActionError(null);
    try {
      await retryReconciliation();
      await refresh();
    } catch (e: any) {
      setActionError(e.message ?? "Retry failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    setBusy(true);
    setActionError(null);
    try {
      await releasePayout(payment!.id);
      await refresh();
    } catch (e: any) {
      setActionError(e.message ?? "Failed to release payout.");
    } finally {
      setBusy(false);
    }
  }

  const canRelease =
    current.status === "succeeded" &&
    current.stripe_fee_verified &&
    current.payout_status !== "released" &&
    Number(current.refunded_amount) === 0;

  const row = (label: string, value: string | number | null | undefined) => (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? "—"}</span>
    </div>
  );

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Payment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={current.status} />
            {current.stripe_fee_verified ? (
              <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Fee verified</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><ShieldQuestion className="h-3 w-3" /> Fee not yet reconciled</Badge>
            )}
            {current.payout_status === "released" && <Badge className="gap-1"><Wallet className="h-3 w-3" /> Payout released</Badge>}
            {current.payout_status === "failed" && <Badge variant="destructive" className="gap-1">Payout failed</Badge>}
            {current.payout_status == null && current.status !== "pending" && current.status !== "refunded" && (
              current.escrow_started_at ? (
                <Badge variant="outline" className="gap-1 border-violet-500/50 text-violet-600 dark:text-violet-400">
                  <Wallet className="h-3 w-3" /> Escrow
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Briefcase className="h-3 w-3" /> Marketplace
                </Badge>
              )
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Platform Calculations</h3>
            {row("Service Price (Base Amount)", money(current.base_amount))}
            {row("Client Service Fee", money(current.service_fee_amount))}
            {row("Client Total", money(current.amount))}
            {row("Platform Commission", money(current.platform_commission_amount))}
            {row("Estimated Payout", money(current.estimated_payout_amount))}
            {row("Actual Payout", money(current.actual_payout_amount))}
            {current.refund_commission != null && (
              <p className="text-xs text-orange-600 dark:text-orange-400 pt-1">
                Refunded — commission forfeited: {money(current.refund_commission)}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Stripe Fees (Exact)</h3>
            {row("Processing Fee", money(current.stripe_processing_fee))}
            {row("Net Amount", money(current.stripe_net_amount))}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Platform Revenue</h3>
            {row("Platform Commission", money(current.platform_commission_amount))}
            {row("Platform Net Service Fee", money(current.platform_net_service_fee))}
            {current.refund_commission != null && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  Commission Forfeited (Refunded)
                </span>
                <span className="text-sm font-medium text-right text-orange-600 dark:text-orange-400">
                  -{money(current.refund_commission)}
                </span>
              </div>
            )}
            {row("Final Revenue", money(current.final_revenue))}
            {current.transfer_fees != null && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-orange-600 dark:text-orange-400">Transfer Fees</span>
                <span className="text-sm font-medium text-right text-orange-600 dark:text-orange-400">
                  -{money(current.transfer_fees)}
                </span>
              </div>
            )}
            {current.net_final_revenue != null && row("Net Final Revenue", money(current.net_final_revenue))}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Payment Method</h3>
            {row("Payment Method", current.stripe_payment_method_type)}
            {row("Card Brand", current.stripe_card_brand)}
            {row("Card Country", current.stripe_card_country)}
            {row("Balance Transaction ID", current.stripe_balance_transaction_id)}
          </div>

          {current.refunded_amount > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Refund</h3>
              {row("Refunded Amount", money(current.refunded_amount))}
              {row("Refunded At", current.refunded_at ? new Date(current.refunded_at).toLocaleString() : undefined)}
            </div>
          )}

          {current.payout_failure_message && (
            <p className="text-xs text-destructive">Last payout attempt failed: {current.payout_failure_message}</p>
          )}
          {current.reconciliation_last_error && !current.stripe_fee_verified && (
            <p className="text-xs text-destructive">Last reconciliation error: {current.reconciliation_last_error}</p>
          )}
          {actionError && <p className="text-xs text-destructive">{actionError}</p>}
        </div>

        <DialogFooter className="gap-2">
          {!current.stripe_fee_verified && (
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={busy} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Retry Reconciliation
            </Button>
          )}
          {canRelease && (
            <Button size="sm" onClick={handleRelease} disabled={busy} className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Release Payout
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transfer Fee Dialog ────────────────────────────────────────────────────

function TransferFeeDialog({
  payment,
  onClose,
  onChanged,
}: {
  payment: Payment | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFee(payment?.transfer_fees != null ? String(payment.transfer_fees) : "");
    setError(null);
  }, [payment]);

  if (!payment) return null;

  const parsedFee = Number(fee);
  const canSubmit = fee.trim() !== "" && Number.isFinite(parsedFee) && parsedFee >= 0;
  const previewNet = canSubmit ? (payment.final_revenue ?? 0) - parsedFee : null;

  async function handleSubmit() {
    if (!payment || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await setTransferFee(payment.id, parsedFee);
      onChanged();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to save transfer fee.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4" /> Transfer Fee
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Enter the fee charged for the transfer sent to the pro for this payout. This is subtracted from the
            payment's final revenue to record the platform's net take.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-fee-input">Transfer fee ($)</Label>
            <Input
              id="transfer-fee-input"
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {previewNet != null && (
            <div className="flex items-center justify-between text-sm rounded-md border border-border/50 px-3 py-2">
              <span className="text-muted-foreground">Net Final Revenue</span>
              <span className="font-medium">{money(previewNet)}</span>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={busy || !canSubmit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Reports View ───────────────────────────────────────────────────────

function AdminReportsView() {
  const { format, currency } = useCurrency();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [proRows, setProRows] = useState<ProFinancialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [payoutDetailsPro, setPayoutDetailsPro] = useState<ProFinancialRow | null>(null);
  const [notifyPro, setNotifyPro] = useState<ProFinancialRow | null>(null);
  const [receiptsPro, setReceiptsPro] = useState<ProFinancialRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);
      const [financial, pros] = await Promise.all([
        fetchFinancialReport(from, to),
        fetchProFinancialReport(from, to),
      ]);
      setReport(financial);
      setProRows(pros);
    } catch (e: any) {
      setError(e.message ?? "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]);

  if (loading) return <LoadingSkeleton rows={6} cols={4} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!report) return null;

  const cards: { label: string; value: number; icon: typeof DollarSign; color: string; isCount?: boolean }[] = [
    { label: "Platform Net Service Fee", value: report.platformNetRevenue, icon: DollarSign, color: "text-blue-600 dark:text-blue-400" },
    { label: "Platform Commission", value: report.platformCommissionTotal, icon: DollarSign, color: "text-indigo-600 dark:text-indigo-400" },
    { label: "Stripe Fees Paid", value: report.stripeFeesPaid, icon: CreditCard, color: "text-red-600 dark:text-red-400" },
    { label: "Transfer Fees Paid", value: report.transferFeesPaid, icon: Landmark, color: "text-red-600 dark:text-red-400" },
    { label: "Pro Payouts Released", value: report.proPayoutsReleased, icon: Wallet, color: "text-purple-600 dark:text-purple-400" },
    { label: "Pending Payouts", value: report.pendingPayoutsTotal, icon: Wallet, color: "text-yellow-600 dark:text-yellow-400" },
    { label: "Refund Totals", value: report.refundTotals, icon: RefreshCw, color: "text-muted-foreground" },
    { label: "Commission Forfeited (Refunds)", value: report.refundCommissionForfeited, icon: RefreshCw, color: "text-orange-600 dark:text-orange-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Financial Reports</h2>
          <p className="text-sm text-muted-foreground">
            Computed entirely from the stored payments ledger — never a live Stripe call. Amounts are stored in USD and converted to {currency.code} for display.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-muted-foreground">Final Revenue</span>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{format(report.netFinalRevenueTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Total payments: {report.totalPaymentCount.toLocaleString()}
          </p>
        </div>
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.color}`}>{c.isCount ? c.value.toLocaleString() : format(c.value)}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2">Pros</h3>
        {proRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
            No payments in this range.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pro</TableHead>
                  <TableHead className="text-right">Bookings/Orders</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Payouts Received</TableHead>
                  <TableHead className="text-right">Pending Payouts</TableHead>
                  <TableHead className="text-right">Refunds Given</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proRows.map((p) => (
                  <TableRow key={p.proId}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.email && <div className="text-xs text-muted-foreground">{p.email}</div>}
                    </TableCell>
                    <TableCell className="text-right">{p.totalBookings.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{format(p.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{format(p.totalCommission)}</TableCell>
                    <TableCell className="text-right text-purple-600 dark:text-purple-400">{format(p.totalPayouts)}</TableCell>
                    <TableCell className="text-right text-yellow-600 dark:text-yellow-400">{format(p.pendingPayouts)}</TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">{format(p.totalRefunds)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPayoutDetailsPro(p)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="Payout details (bank / Stripe)"
                        >
                          <Landmark className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setNotifyPro(p)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="Confirm transfer & send payout receipt"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setReceiptsPro(p)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="View payout receipts (admin + pro copies)"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <PayoutDetailsDialog pro={payoutDetailsPro} onClose={() => setPayoutDetailsPro(null)} />
      <NotifyPayoutSentDialog pro={notifyPro} onClose={() => setNotifyPro(null)} onSent={load} />
      <PayoutReceiptsReviewDialog pro={receiptsPro} onClose={() => setReceiptsPro(null)} />
    </div>
  );
}

// ─── Payout Details Dialog ─────────────────────────────────────────────────────

function PayoutDetailsDialog({ pro, onClose }: { pro: ProFinancialRow | null; onClose: () => void }) {
  const [bank, setBank] = useState<AdminProBankDetails>(null);
  const [stripe, setStripe] = useState<TradespersonStripeAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pro) return;
    setLoading(true);
    setError(null);
    setBank(null);
    setStripe(null);
    Promise.all([
      fetchAdminProBankDetails(pro.proId),
      fetchConnectStatus(pro.proId).catch(() => null),
    ])
      .then(([b, s]) => {
        setBank(b);
        setStripe(s);
      })
      .catch((e: any) => setError(e.message ?? "Failed to load payout details."))
      .finally(() => setLoading(false));
  }, [pro]);

  if (!pro) return null;

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-words">{value || "—"}</span>
    </div>
  );

  return (
    <Dialog open={!!pro} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Details — {pro.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" /> Bank Transfer Details
              </p>
              {bank ? (
                <div className="rounded-lg border border-border px-3">
                  {row("Full name", bank.fullName)}
                  {row("Bank name", bank.nameOfBank)}
                  {row("Branch", bank.bankBranch)}
                  {row("Account type", bank.accountType)}
                  {row("Account number", bank.accountNumber)}
                  {row("Country", bank.country)}
                  {row("Currency", bank.currency)}
                  {row("Home address", bank.homeAddress)}
                  {row("Phone", bank.phone)}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border px-3 py-3">
                  This pro hasn't added bank transfer details.
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Stripe Connect
              </p>
              {stripe ? (
                <div className="rounded-lg border border-border px-3">
                  {row("Connect account ID", stripe.stripe_connect_account_id)}
                  {row("Details submitted", stripe.details_submitted ? "Yes" : "No")}
                  {row("Charges enabled", stripe.charges_enabled ? "Yes" : "No")}
                  {row("Payouts enabled", stripe.payouts_enabled ? "Yes" : "No")}
                  {stripe.disabled_reason && row("Disabled reason", stripe.disabled_reason)}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border px-3 py-3">
                  This pro hasn't started Stripe Connect onboarding.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm Transfer (Notify Payout Sent) Dialog ────────────────────────────

const PAYOUT_RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_PAYOUT_RECEIPT_SIZE = 10 * 1024 * 1024; // 10 MB — mirrors src/backend/admin.ts's upload limit
const TRANSFER_METHODS = ["Western Union", "Bank Transfer", "Wise", "Other"] as const;

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function NotifyPayoutSentDialog({
  pro,
  onClose,
  onSent,
}: {
  pro: ProFinancialRow | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { format } = useCurrency();
  const [ready, setReady] = useState<Payment[]>([]);
  const [bankDetails, setBankDetails] = useState<AdminProBankDetails>(null);
  const [checking, setChecking] = useState(false);

  const [transferMethod, setTransferMethod] = useState<string>("Western Union");
  const [transferMethodOther, setTransferMethodOther] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [transferDate, setTransferDate] = useState(todayDateInput());
  const [expectedDelivery, setExpectedDelivery] = useState("Within 24 Hours");
  const [adminNotes, setAdminNotes] = useState("");
  const [adminOriginalFile, setAdminOriginalFile] = useState<File | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ total: number; receiptNumber: string } | null>(null);

  useEffect(() => {
    if (!pro) return;
    setChecking(true);
    setError(null);
    setResult(null);
    setBankDetails(null);
    setTransferMethod("Western Union");
    setTransferMethodOther("");
    setTransferReference("");
    setTransferDate(todayDateInput());
    setExpectedDelivery("Within 24 Hours");
    setAdminNotes("");
    setAdminOriginalFile(null);
    Promise.all([fetchReadyPayouts(), fetchAdminProBankDetails(pro.proId)])
      .then(([all, bank]) => {
        setReady(all.filter((p) => p.provider_id === pro.proId));
        setBankDetails(bank);
      })
      .catch((e: any) => setError(e.message ?? "Failed to check this pro's ready payments."))
      .finally(() => setChecking(false));
  }, [pro]);

  if (!pro) return null;

  const previewTotal = ready.reduce((s, p) => s + (p.actual_payout_amount ?? p.estimated_payout_amount ?? 0), 0);
  const resolvedMethod = transferMethod === "Other" ? transferMethodOther.trim() : transferMethod;
  const hasBankDetails = bankDetails !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_PAYOUT_RECEIPT_SIZE) {
      setError("File too large. Maximum size is 10 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setAdminOriginalFile(file);
  }

  async function handleSend() {
    if (!pro || ready.length === 0) return;
    if (!hasBankDetails) {
      setError("This pro has no banking details on file. A payout cannot be confirmed until they add bank transfer details.");
      return;
    }
    if (!pro.email) {
      setError("This pro has no email on file.");
      return;
    }
    if (!resolvedMethod) {
      setError("Transfer method is required.");
      return;
    }
    if (!adminOriginalFile) {
      setError("Proof of transfer is required — attach the raw Western Union / bank receipt before confirming.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // Re-checked server-side against payments_ready_for_payout at send time —
      // if the hold period, fee verification, or refund status changed since
      // the dialog opened, this throws instead of marking anything paid.
      const { total, paymentIds } = await releaseManualPayout(pro.proId);

      const payments = await fetchPaymentsByIds(paymentIds);
      const bookingIds = [...new Set(payments.filter((p) => p.booking_id).map((p) => p.booking_id as string))];
      const serviceByBooking: Record<string, string> = {};
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase.from("client_bookings").select("id, service").in("id", bookingIds);
        for (const b of bookings ?? []) serviceByBooking[b.id as string] = b.service as string;
      }

      const currency = payments[0]?.currency ?? "USD";
      const { receiptNumber, payoutNumber } = await allocatePayoutReceiptNumbers();
      const receiptData = buildPayoutReceiptData({
        receiptNumber,
        payoutNumber,
        transferMethod: resolvedMethod,
        transferReference,
        transferDate,
        expectedDelivery,
        currency,
        finalPayout: total,
        adminNotes,
        payments,
        serviceByBooking,
        pro: { name: pro.name, id: pro.proId, email: pro.email },
      });
      const receiptPdfBlob = await generatePayoutReceiptPdf(receiptData);

      await confirmPayoutTransfer({
        proId: pro.proId,
        proEmail: pro.email,
        proName: pro.name,
        amount: total,
        currency,
        paymentIds,
        receiptNumber,
        payoutNumber,
        transferMethod: resolvedMethod,
        transferReference,
        transferDate,
        expectedDelivery,
        adminNotes,
        adminOriginalFile,
        receiptPdfBlob,
      });

      setResult({ total, receiptNumber });
      onSent();
    } catch (e: any) {
      setError(e.message ?? "Failed to confirm transfer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!pro} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Transfer — {pro.name}</DialogTitle>
        </DialogHeader>

        {result !== null ? (
          <p className="text-sm text-green-600 dark:text-green-400 py-4 text-center">
            Marked {format(result.total)} as paid out, generated receipt <strong>{result.receiptNumber}</strong>,
            and emailed {pro.name} their TradeHub payout receipt.
          </p>
        ) : checking ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Checking this pro's escrow-cleared payments…</p>
        ) : error && ready.length === 0 ? (
          <p className="text-sm text-destructive py-4">{error}</p>
        ) : ready.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            None of this pro's payments are past their escrow hold period yet — they may still be
            within the hold window, awaiting fee reconciliation, refunded, or already paid out.
            Nothing can be marked paid or sent right now.
          </p>
        ) : !hasBankDetails ? (
          <p className="text-sm text-destructive py-4">
            This pro hasn't added banking / transfer details yet. A payout cannot be confirmed
            until they add their details — check back once they've filled them in.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{ready.length}</strong> payment{ready.length !== 1 ? "s" : ""} past
              their escrow hold period, totaling <strong className="text-foreground">{format(previewTotal)}</strong>.
              Confirming will mark them paid out, generate an official TradeHub receipt PDF, and email it to {pro.name} —
              use this after you've manually wired the funds using their bank details.
            </p>

            <div className="space-y-1.5">
              <Label>Transfer Method</Label>
              <Select value={transferMethod} onValueChange={setTransferMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSFER_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transferMethod === "Other" && (
                <Input
                  placeholder="Transfer method name"
                  value={transferMethodOther}
                  onChange={(e) => setTransferMethodOther(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transferReference">Transfer Reference</Label>
              <Input
                id="transferReference"
                placeholder="e.g. WU483928393"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="transferDate">Transfer Date</Label>
                <Input
                  id="transferDate"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                <Input
                  id="expectedDelivery"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminNotes">Administrator Notes (optional)</Label>
              <Textarea
                id="adminNotes"
                placeholder="Shown on the receipt only if filled in"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutReceipt">Original transfer proof (admin-only, required)</Label>
              <label
                htmlFor="payoutReceipt"
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border border-dashed px-3 py-2 text-sm cursor-pointer hover:bg-muted/50",
                  adminOriginalFile ? "border-border" : "border-destructive/50",
                )}
              >
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {adminOriginalFile ? adminOriginalFile.name : "Attach the raw Western Union / bank receipt"}
                </span>
              </label>
              <input
                id="payoutReceipt"
                type="file"
                accept={PAYOUT_RECEIPT_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or PDF up to 10 MB. Required as proof the transfer was actually sent —
                never shown to the pro, admin review only.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{result !== null ? "Close" : "Cancel"}</Button>
          {result === null && ready.length > 0 && hasBankDetails && (
            <Button onClick={handleSend} disabled={sending || checking || !adminOriginalFile} className="gap-2">
              <Mail className="h-3.5 w-3.5" />
              {sending ? "Confirming…" : "Confirm Transfer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payout Receipts Review Dialog (admin-only: original + generated) ────────

function PayoutReceiptsReviewDialog({
  pro,
  onClose,
}: {
  pro: ProFinancialRow | null;
  onClose: () => void;
}) {
  const { format } = useCurrency();
  const [receipts, setReceipts] = useState<PayoutReceiptAdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pro) return;
    setLoading(true);
    setError(null);
    fetchAdminPayoutReceipts(pro.proId)
      .then(setReceipts)
      .catch((e: any) => setError(e.message ?? "Failed to load payout receipts."))
      .finally(() => setLoading(false));
  }, [pro]);

  if (!pro) return null;

  return (
    <Dialog open={!!pro} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Receipts — {pro.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : receipts.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-3 py-6 text-center">
            No payout receipts recorded for this pro yet.
          </p>
        ) : (
          <div className="space-y-3">
            {receipts.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {r.receipt_number ?? "Legacy receipt — pre-dates this system"}
                  </span>
                  <span className="text-sm font-semibold text-emerald-500">{format(r.amount)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {r.transfer_method && ` · ${r.transfer_method}`}
                </div>
                {r.admin_notes && (
                  <p className="text-xs text-muted-foreground rounded bg-muted/50 px-2 py-1">{r.admin_notes}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.adminReceiptUrl ? (
                    <a href={r.adminReceiptUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" /> View Admin Original
                      </Button>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No admin original on file</span>
                  )}
                  {r.generatedReceiptUrl ? (
                    <a href={r.generatedReceiptUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Receipt className="h-3.5 w-3.5" /> View Pro Receipt (Generated PDF)
                      </Button>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No generated receipt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Orders View ────────────────────────────────────────────────────────

function AdminOrderDetailDialog({
  order,
  onClose,
}: {
  order: AdminOrder | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const isDelivery = order.shippingMethod === "delivery";
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
  });

  return (
    <Dialog open={!!order} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Order Details</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Order #{String(order.id).padStart(6, "0")}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <div className="rounded-lg border border-border divide-y divide-border text-sm">
            <BookingDetailRow label="Order ID">
              <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Customer">
              <span className="font-medium">{order.fullName}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Email">
              <span className="truncate">{order.email || "—"}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Phone">
              <span>{order.phone || "—"}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Shipping Method">
              <span className="flex items-center gap-1.5">
                {isDelivery ? (
                  <><Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> Delivery</>
                ) : (
                  <><Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> Pickup</>
                )}
              </span>
            </BookingDetailRow>
            {isDelivery && (
              <BookingDetailRow label="Ship To">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {order.shippingAddress || "—"}
                </span>
              </BookingDetailRow>
            )}
            <BookingDetailRow label="Items">
              <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Subtotal">
              <span>${order.subTotal.toFixed(2)}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Shipping">
              <span>{order.shippingTotal > 0 ? `$${order.shippingTotal.toFixed(2)}` : "Free"}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Service fee">
              <span>${order.serviceFee.toFixed(2)}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Total">
              <span className="font-semibold">${order.totalPrice.toFixed(2)}</span>
            </BookingDetailRow>
            <BookingDetailRow label="Delivery Status">
              {order.isDelivered ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Delivered
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {isDelivery ? "Pending Delivery" : "Pickup"}
                </span>
              )}
            </BookingDetailRow>
            <BookingDetailRow label="Refund Status">
              {order.refunded || order.returnRequestStatus === "refunded" ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Refunded
                </span>
              ) : order.returnRequestStatus === "pro_approved" ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Return Approved
                </span>
              ) : order.returnRequestStatus === "pending" ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Return Requested
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </BookingDetailRow>
            <BookingDetailRow label="Order Date">
              <span className="text-muted-foreground">{orderDate}</span>
            </BookingDetailRow>
          </div>

          {order.items.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1.5">Items ({order.items.length})</p>
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.serviceName}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 rounded-md object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.serviceName}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">${(item.productPrice * item.quantity).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">${item.productPrice.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 pt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ORDER_PAGE_SIZE = 20;

function AdminOrdersView() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [viewingOrder, setViewingOrder] = useState<AdminOrder | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchAdminOrders());
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(order: AdminOrder) {
    if (!confirm(`Delete order #${String(order.id).padStart(6, "0")}? This cannot be undone.`)) return;
    setDeletingId(order.id);
    try {
      await deleteAdminOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (e: any) {
      alert(e.message ?? "Failed to delete order");
    } finally {
      setDeletingId(null);
    }
  }

  const totalCount = orders.length;
  const deliveredCount = orders.filter((o) => o.isDelivered).length;
  const deliveryPendingCount = orders.filter((o) => o.shippingMethod === "delivery" && !o.isDelivered).length;
  const pickupCount = orders.filter((o) => o.shippingMethod !== "delivery").length;
  const refundedCount = orders.filter((o) => o.refunded).length;

  const filtered = orders.filter((o) => {
    if (methodFilter === "Delivery" && o.shippingMethod !== "delivery") return false;
    if (methodFilter === "Pickup" && o.shippingMethod === "delivery") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        String(o.id).includes(q) ||
        o.fullName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ORDER_PAGE_SIZE);
  const pageRows = filtered.slice(page * ORDER_PAGE_SIZE, (page + 1) * ORDER_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={7} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Orders" value={totalCount} color="text-blue-600 dark:text-blue-400" icon={ShoppingBag} iconColor="text-blue-500" />
        <StatCard label="Delivered" value={deliveredCount} color="text-green-600 dark:text-green-400" icon={ShieldCheck} iconColor="text-green-500" />
        <StatCard label="Pending Delivery" value={deliveryPendingCount} color="text-yellow-600 dark:text-yellow-400" icon={Truck} iconColor="text-yellow-500" />
        <StatCard label="Pickup Orders" value={pickupCount} color="text-purple-600 dark:text-purple-400" icon={Package} iconColor="text-purple-500" />
        <StatCard label="Refunded" value={refundedCount} color="text-red-600 dark:text-red-400" icon={RefreshCw} iconColor="text-red-500" />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select
          value={methodFilter}
          onValueChange={(v) => { setMethodFilter(v); setPage(0); }}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Delivery", "Pickup"].map((m) => (
              <SelectItem key={m} value={m}>{m === "All" ? "All Methods" : m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">All Orders</h2>
        <p className="text-xs text-muted-foreground">
          {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No orders found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Order #", "Customer", "Email", "Method", "Total", "Delivered", "Refunded", "Date", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((order) => {
                  const isDelivery = order.shippingMethod === "delivery";
                  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "numeric", day: "numeric", year: "numeric",
                  });

                  return (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground whitespace-nowrap">
                        #{String(order.id).padStart(6, "0")}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{order.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{order.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isDelivery
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}>
                          {isDelivery
                            ? <><Truck className="h-3 w-3" /> Delivery</>
                            : <><Package className="h-3 w-3" /> Pickup</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">${order.totalPrice.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {order.isDelivered ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {order.refunded || order.returnRequestStatus === "refunded" ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{orderDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                            title="View order details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(order)}
                            disabled={deletingId === order.id}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
                            title="Delete order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} orders
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AdminOrderDetailDialog
        order={viewingOrder}
        onClose={() => setViewingOrder(null)}
      />
    </div>
  );
}

// ─── Admin Reviews View ────────────────────────────────────────────────────────

const REVIEW_PAGE_SIZE = 20;

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function AdminReviewsView() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setReviews(await fetchAdminReviews());
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(review: AdminReview) {
    setDeletingId(review.id);
    try {
      await deleteAdminReview(review.id);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
    } catch (e: any) {
      alert(e.message ?? "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  }

  const totalCount = reviews.length;
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;

  const filtered = reviews.filter((r) => {
    if (ratingFilter !== "All" && r.rating !== Number(ratingFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.tradespersonName.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / REVIEW_PAGE_SIZE);
  const pageRows = filtered.slice(page * REVIEW_PAGE_SIZE, (page + 1) * REVIEW_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={6} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Reviews" value={totalCount} color="text-blue-600 dark:text-blue-400" icon={Star} iconColor="text-blue-500" />
        <StatCard label="5-Star Reviews" value={fiveStarCount} color="text-yellow-600 dark:text-yellow-400" icon={Star} iconColor="text-yellow-500" />
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Star className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{avgRating > 0 ? avgRating : "—"}</p>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search reviews…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "5", "4", "3", "2", "1"].map((v) => (
              <SelectItem key={v} value={v}>{v === "All" ? "All Ratings" : `${v} Star${v !== "1" ? "s" : ""}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5 h-9 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* All Reviews header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">All Reviews</h2>
        <p className="text-sm text-muted-foreground">
          {filtered.length} review{filtered.length !== 1 ? "s" : ""}
          {search || ratingFilter !== "All" ? " matching filters" : ""}
        </p>
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No reviews found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Client", "Tradesperson", "Rating", "Title", "Review", "Date", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((review) => {
                  const dateDisplay = new Date(review.createdAt).toLocaleDateString("en-US", {
                    month: "numeric", day: "numeric", year: "numeric",
                  });
                  return (
                    <tr key={review.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{review.clientName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{review.tradespersonName}</td>
                      <td className="px-4 py-3">
                        <StarRating rating={review.rating} />
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate" title={review.title}>
                        {review.title || <span className="text-muted-foreground/50 italic text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[260px] truncate text-muted-foreground" title={review.description}>
                        {review.description || <span className="italic text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateDisplay}</td>
                      <td className="px-4 py-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              disabled={deletingId === review.id}
                              className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
                              title="Delete review"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {review.clientName}'s review of {review.tradespersonName}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(review)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Testimonials View ──────────────────────────────────────────────────

const TESTIMONIAL_PAGE_SIZE = 20;

const TESTIMONIAL_STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function AdminTestimonialsView() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [actionId, setActionId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setTestimonials(await fetchAdminTestimonials());
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(t: AdminTestimonial) {
    setActionId(t.id);
    try {
      await updateTestimonialStatus(t.id, "approved");
      setTestimonials((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "approved" } : x));
    } catch (e: any) {
      alert(e.message ?? "Failed to approve testimonial");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(t: AdminTestimonial) {
    setActionId(t.id);
    try {
      await updateTestimonialStatus(t.id, "rejected");
      setTestimonials((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "rejected" } : x));
    } catch (e: any) {
      alert(e.message ?? "Failed to reject testimonial");
    } finally {
      setActionId(null);
    }
  }

  const total = testimonials.length;
  const pendingCount  = testimonials.filter((t) => t.status === "pending").length;
  const approvedCount = testimonials.filter((t) => t.status === "approved").length;
  const rejectedCount = testimonials.filter((t) => t.status === "rejected").length;

  const filtered = testimonials.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.displayName.toLowerCase().includes(q) ||
        t.submitterName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.userType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / TESTIMONIAL_PAGE_SIZE);
  const pageRows = filtered.slice(page * TESTIMONIAL_PAGE_SIZE, (page + 1) * TESTIMONIAL_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={6} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={total} color="text-blue-600 dark:text-blue-400" icon={Film} iconColor="text-blue-500" />
        <StatCard label="Pending" value={pendingCount} color="text-yellow-600 dark:text-yellow-400" icon={Clock} iconColor="text-yellow-500" />
        <StatCard label="Approved" value={approvedCount} color="text-green-600 dark:text-green-400" icon={CheckCircle} iconColor="text-green-500" />
        <StatCard label="Rejected" value={rejectedCount} color="text-red-600 dark:text-red-400" icon={XCircle} iconColor="text-red-500" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search testimonials..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Pending", "Approved", "Rejected"].map((s) => (
              <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div>
        <h2 className="text-base font-semibold">All Testimonials</h2>
        <p className="text-xs text-muted-foreground">
          {filtered.length} testimonial{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No testimonials found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Submitter", "Display Name", "User Type", "Description", "Status", "Date", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((t) => {
                  const dateDisplay = new Date(t.createdAt).toLocaleDateString("en-US", {
                    month: "numeric", day: "numeric", year: "numeric",
                  });
                  const isActing = actionId === t.id;
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{t.submitterName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{t.displayName || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{t.userType || "—"}</td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-muted-foreground" title={t.description}>
                        {t.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TESTIMONIAL_STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateDisplay}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {t.videoUrl && (
                            <a
                              href={t.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                              title="View video"
                            >
                              <Film className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleApprove(t)}
                            disabled={isActing || t.status === "approved"}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-green-600 hover:border-green-400 transition-colors disabled:opacity-40"
                            title="Approve"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReject(t)}
                            disabled={isActing || t.status === "rejected"}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-40"
                            title="Decline"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} testimonials
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Verifications View ─────────────────────────────────────────────────

const VERIFICATION_PAGE_SIZE = 20;

const VERIFICATION_STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const FILE_TYPE_LABELS: Record<string, string> = {
  "id-front": "ID Front",
  "id-back": "ID Back",
  "facial": "Facial Photo",
  "certificate": "Certificate",
};

function isImagePath(path: string) {
  return /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(path);
}

function VerificationDocumentsDialog({
  verification,
  onClose,
}: {
  verification: AdminVerification | null;
  onClose: () => void;
}) {
  const [docs, setDocs] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!verification) return;
    setDocs([]);
    setError(null);
    setLoading(true);
    fetchVerificationDocuments(verification.id)
      .then(setDocs)
      .catch((e: any) => setError(e.message ?? "Failed to load documents"))
      .finally(() => setLoading(false));
  }, [verification]);

  return (
    <Dialog open={!!verification} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Verification Documents — {verification?.tradespersonName}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 min-h-[160px]">
          {loading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading documents…
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {!loading && !error && docs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No documents found for this request.</p>
          )}
          {!loading && !error && docs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {docs.map((doc) => (
                <div key={doc.filePath} className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {FILE_TYPE_LABELS[doc.fileType] ?? doc.fileType}
                  </p>
                  {isImagePath(doc.filePath) ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                      <img
                        src={doc.url}
                        alt={FILE_TYPE_LABELS[doc.fileType] ?? doc.fileType}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-40 object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-4 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span className="truncate">View file</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VerificationEditDialog({
  verification,
  onClose,
  onSaved,
}: {
  verification: AdminVerification | null;
  onClose: () => void;
  onSaved: (id: number, status: string, reason: string | null) => void;
}) {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (verification) {
      setStatus(verification.status);
      setReason(verification.reason ?? "");
      setError(null);
    }
  }, [verification]);

  async function handleSave() {
    if (!verification) return;
    setSaving(true);
    setError(null);
    try {
      await updateVerificationStatus(
        verification.id,
        status as "approved" | "rejected",
        reason.trim() || undefined,
      );
      onSaved(verification.id, status, reason.trim() || null);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to update verification");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!verification} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Verification
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 space-y-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["pending", "approved", "rejected"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verification-reason">Reason</Label>
            <textarea
              id="verification-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for approval or rejection..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminVerificationsView() {
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [actionId, setActionId] = useState<number | null>(null);
  const [editingVerification, setEditingVerification] = useState<AdminVerification | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState<AdminVerification | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setVerifications(await fetchAdminVerifications());
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(v: AdminVerification) {
    setActionId(v.id);
    try {
      await updateVerificationStatus(v.id, "approved");
      setVerifications((prev) => prev.map((x) => x.id === v.id ? { ...x, status: "approved" } : x));
    } catch (e: any) {
      alert(e.message ?? "Failed to approve verification");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(v: AdminVerification) {
    setActionId(v.id);
    try {
      await updateVerificationStatus(v.id, "rejected");
      setVerifications((prev) => prev.map((x) => x.id === v.id ? { ...x, status: "rejected" } : x));
    } catch (e: any) {
      alert(e.message ?? "Failed to reject verification");
    } finally {
      setActionId(null);
    }
  }

  const total         = verifications.length;
  const pendingCount  = verifications.filter((v) => v.status === "pending").length;
  const approvedCount = verifications.filter((v) => v.status === "approved").length;
  const rejectedCount = verifications.filter((v) => v.status === "rejected").length;

  const filtered = verifications.filter((v) => {
    if (statusFilter !== "All" && v.status !== statusFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.tradespersonName.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        (v.reason ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / VERIFICATION_PAGE_SIZE);
  const pageRows = filtered.slice(page * VERIFICATION_PAGE_SIZE, (page + 1) * VERIFICATION_PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={8} cols={5} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={total} color="text-blue-600 dark:text-blue-400" icon={BadgeCheck} iconColor="text-blue-500" />
        <StatCard label="Pending" value={pendingCount} color="text-yellow-600 dark:text-yellow-400" icon={Clock} iconColor="text-yellow-500" />
        <StatCard label="Approved" value={approvedCount} color="text-green-600 dark:text-green-400" icon={CheckCircle} iconColor="text-green-500" />
        <StatCard label="Rejected" value={rejectedCount} color="text-red-600 dark:text-red-400" icon={XCircle} iconColor="text-red-500" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search verifications..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Pending", "Approved", "Rejected"].map((s) => (
              <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div>
        <h2 className="text-base font-semibold">All Verifications</h2>
        <p className="text-xs text-muted-foreground">
          {filtered.length} verification{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No verifications found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Tradesperson", "Status", "Reason", "Date", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((v) => {
                  const dateDisplay = new Date(v.createdAt).toLocaleDateString("en-US", {
                    month: "numeric", day: "numeric", year: "numeric",
                  });
                  const isActing = actionId === v.id;
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{v.tradespersonName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${VERIFICATION_STATUS_COLORS[v.status] ?? "bg-muted text-muted-foreground"}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-muted-foreground" title={v.reason ?? ""}>
                        {v.reason || <span className="italic text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateDisplay}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingDocuments(v)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:border-blue-400 transition-colors"
                            title="View uploaded documents"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingVerification(v)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            title="Edit status & reason"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleApprove(v)}
                            disabled={isActing || v.status === "approved"}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-green-600 hover:border-green-400 transition-colors disabled:opacity-40"
                            title="Accept"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReject(v)}
                            disabled={isActing || v.status === "rejected"}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-40"
                            title="Decline"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} verifications
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <VerificationDocumentsDialog
        verification={viewingDocuments}
        onClose={() => setViewingDocuments(null)}
      />

      <VerificationEditDialog
        verification={editingVerification}
        onClose={() => setEditingVerification(null)}
        onSaved={(id, status, reason) => {
          setVerifications((prev) =>
            prev.map((v) => v.id === id ? { ...v, status: status as AdminVerification["status"], reason } : v),
          );
          setEditingVerification(null);
        }}
      />
    </div>
  );
}

// ─── Generic Table View ────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function TableView({
  title,
  fetcher,
}: {
  title: string;
  fetcher: () => Promise<Record<string, any>[]>;
}) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetcher();
      setRows(data);
      setPage(0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSkeleton rows={6} cols={4} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  const filtered = search
    ? rows.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : rows;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No records found
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-3 text-foreground/80 max-w-[220px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        <CellValue col={col} value={row[col]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

function CellValue({ col, value }: { col: string; value: any }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50 italic text-xs">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"} className="text-xs">
        {value ? "true" : "false"}
      </Badge>
    );
  }

  const str = String(value);

  if (col.toLowerCase().includes("status")) {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    const cls = colorMap[str.toLowerCase()] ?? "bg-muted text-muted-foreground";
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {str}
      </span>
    );
  }

  if ((col.toLowerCase().includes("at") || col.toLowerCase().includes("date")) && str.length > 10) {
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return (
          <span className="text-muted-foreground">
            {date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </span>
        );
      }
    } catch {
      // fall through
    }
  }

  if (col.toLowerCase().includes("rating")) {
    const num = Number(str);
    if (!isNaN(num)) {
      return (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {str}
        </span>
      );
    }
  }

  if (col.toLowerCase().includes("price") || col.toLowerCase().includes("total")) {
    const num = Number(str);
    if (!isNaN(num)) {
      return <span className="font-mono font-medium">${num.toFixed(2)}</span>;
    }
  }

  if (str.startsWith("http")) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noreferrer"
        className="text-primary hover:underline truncate block max-w-[180px]"
      >
        {str}
      </a>
    );
  }

  return <span className="truncate">{str}</span>;
}

// ─── Admin Audit: Logs ────────────────────────────────────────────────────────

function AdminAuditLogsView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLogs(await fetchAuditLogs(500));
    } catch (e: any) {
      setError(e.message ?? "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-audit-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const activityTypes = useMemo(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    let result = logs;
    if (typeFilter !== "all") result = result.filter((l) => l.action === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.details?.toLowerCase().includes(q) ||
          l.adminName?.toLowerCase().includes(q) ||
          l.targetType?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [logs, typeFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function exportCSV() {
    const header = "ID,Time,Action,Admin,Target Type,Details";
    const rows = filtered.map((l) =>
      [
        l.id,
        l.createdAt,
        l.action,
        l.adminName,
        l.targetType,
        `"${(l.details ?? "").replace(/"/g, '""')}"`,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingSkeleton rows={8} cols={5} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search logs…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {activityTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No logs found</td>
                </tr>
              ) : (
                paginated.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.adminName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.targetType || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.details || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Audit: Settings ────────────────────────────────────────────────────

function AdminSettingsView() {
  const [settings, setSettings] = useState<AdminSettings>({
    siteName: "Capture Connect - TradeHub Marketplace",
    maintenanceMode: false,
    allowRegistrations: true,
    sessionTimeoutHours: 24,
    defaultCurrency: "USD",
    auditLogRetentionDays: 90,
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const adminEmail = getAdminEmail();

  useEffect(() => {
    getAdminSettings().then(setSettings);
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleChangePassword() {
    setPwError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await updateAdminPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e.message ?? "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSave() {
    setSaveError(null);
    try {
      await saveAdminSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save settings.");
    }
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column — site configuration */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Site Configuration</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">Shows a maintenance page to all users</p>
                </div>
                <Toggle
                  checked={settings.maintenanceMode}
                  onChange={() => setSettings((s) => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Allow New Registrations</p>
                  <p className="text-xs text-muted-foreground">Permit new clients and pros to sign up</p>
                </div>
                <Toggle
                  checked={settings.allowRegistrations}
                  onChange={() => setSettings((s) => ({ ...s, allowRegistrations: !s.allowRegistrations }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sessionTimeout">Session Timeout</Label>
                <Select
                  value={String(settings.sessionTimeoutHours)}
                  onValueChange={(v) => setSettings((s) => ({ ...s, sessionTimeoutHours: Number(v) }))}
                >
                  <SelectTrigger id="sessionTimeout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select
                  value={settings.defaultCurrency}
                  onValueChange={(v) => setSettings((s) => ({ ...s, defaultCurrency: v }))}
                >
                  <SelectTrigger id="defaultCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP — British Pound</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                    <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auditRetention">Audit Log Retention</Label>
                <Select
                  value={String(settings.auditLogRetentionDays)}
                  onValueChange={(v) => setSettings((s) => ({ ...s, auditLogRetentionDays: Number(v) }))}
                >
                  <SelectTrigger id="auditRetention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <Button onClick={handleSave} className="gap-2">
            {saved ? <><CheckCircle className="h-4 w-4" /> Saved</> : "Save Settings"}
          </Button>
        </div>

        {/* Right column — admin account + change password */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Admin Account</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <Label>Admin Email</Label>
                <Input value={adminEmail ?? "admin@tradehub.com"} readOnly className="bg-muted/30 cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Change Password</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {pwError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" /> Password updated successfully.
                </p>
              )}
              <Button onClick={handleChangePassword} disabled={pwSaving} variant="outline" className="gap-2">
                {pwSaving ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Updating…</>
                ) : (
                  <><KeyRound className="h-3.5 w-3.5" /> Update Password</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Audit: Platform Settings ──────────────────────────────────────────

const CURRENCY_OPTIONS = ["USD", "GBP", "EUR", "CAD", "AUD"] as const;

const DEFAULT_PLATFORM_SETTINGS_INPUT: PlatformSettingsInput = {
  platformName: "Capture Connect",
  defaultCurrency: "USD",
  clientServiceFeePercent: 6,
  proCommissionPercent: 14,
  defaultPayoutHoldDays: 3,
  refundWindowDays: 14,
  taxEnabled: false,
  taxPercent: 0,
  platformStatus: "active",
};

function SettingsToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

function PlatformSettingsView() {
  const [settings, setSettings] = useState<PlatformSettingsInput>(DEFAULT_PLATFORM_SETTINGS_INPUT);
  const [meta, setMeta] = useState<{ version: number; updatedAt: string } | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [history, setHistory] = useState<SettingsHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPlatformSettings();
      const { id, version, updatedAt, updatedBy, ...input } = data;
      setSettings(input);
      setMeta({ version, updatedAt });
    } catch (e: any) {
      setLoadError(e.message ?? "Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      setHistory(await fetchSettingsHistory(50));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadHistory();
  }, []);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await updatePlatformSettings(settings, reason.trim() || undefined);
      const { id, version, updatedAt, updatedBy, ...input } = updated;
      setSettings(input);
      setMeta({ version, updatedAt });
      setReason("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadHistory();
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save platform settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={6} cols={2} />;
  if (loadError) return <ErrorCard message={loadError} onRetry={load} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold">Payment Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Marketplace fees and payment configuration — changes apply to all future payments only.
          {meta && (
            <> Currently version {meta.version}, last updated {new Date(meta.updatedAt).toLocaleString()}.</>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Fees &amp; Payments</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Select
              value={settings.defaultCurrency}
              onValueChange={(v) => setSettings((s) => ({ ...s, defaultCurrency: v }))}
            >
              <SelectTrigger id="defaultCurrency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientFee">Client Service Fee %</Label>
            <Input
              id="clientFee"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={settings.clientServiceFeePercent}
              onChange={(e) => setSettings((s) => ({ ...s, clientServiceFeePercent: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proCommission">Professional Commission %</Label>
            <Input
              id="proCommission"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={settings.proCommissionPercent}
              onChange={(e) => setSettings((s) => ({ ...s, proCommissionPercent: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payoutHold">Default Payout Hold Days</Label>
            <Input
              id="payoutHold"
              type="number"
              min={0}
              max={90}
              value={settings.defaultPayoutHoldDays}
              onChange={(e) => setSettings((s) => ({ ...s, defaultPayoutHoldDays: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refundWindow">Refund Window (days)</Label>
            <Input
              id="refundWindow"
              type="number"
              min={0}
              max={365}
              value={settings.refundWindowDays}
              onChange={(e) => setSettings((s) => ({ ...s, refundWindowDays: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="platformStatus">Platform Status</Label>
            <Select
              value={settings.platformStatus}
              onValueChange={(v) => setSettings((s) => ({ ...s, platformStatus: v as PlatformSettingsInput["platformStatus"] }))}
            >
              <SelectTrigger id="platformStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance (payments disabled)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Enable Taxes</p>
              <p className="text-xs text-muted-foreground">Apply a tax percentage to future payments</p>
            </div>
            <SettingsToggle
              checked={settings.taxEnabled}
              onChange={() => setSettings((s) => ({ ...s, taxEnabled: !s.taxEnabled }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="taxPercent">Tax Percentage</Label>
            <Input
              id="taxPercent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              disabled={!settings.taxEnabled}
              value={settings.taxPercent}
              onChange={(e) => setSettings((s) => ({ ...s, taxPercent: Number(e.target.value) }))}
              className={!settings.taxEnabled ? "bg-muted/30 cursor-not-allowed" : undefined}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="changeReason">Reason for change (optional)</Label>
            <Textarea
              id="changeReason"
              placeholder="e.g. Increase platform revenue"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{saveError}</p>
      )}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? (
          <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</>
        ) : saved ? (
          <><CheckCircle className="h-4 w-4" /> Saved</>
        ) : (
          "Save Changes"
        )}
      </Button>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Settings History</h3>
        </div>
        {historyLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">Loading…</p>
        ) : history.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No changes recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Setting</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Old Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">New Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Changed At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs">{h.settingName}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{h.oldValue ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{h.newValue ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{h.changeReason || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(h.changedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Audit: Security Overview ──────────────────────────────────────────

function AdminSecurityOverviewView() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [suspendedUsers, setSuspendedUsers] = useState<AdminUser[]>([]);
  const [loginHistory, setLoginHistory] = useState<AdminLoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsuspending, setUnsuspending] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, suspended] = await Promise.all([
        fetchSecurityMetrics(),
        fetchSuspendedUsers(),
      ]);
      setMetrics(metricsData);
      setSuspendedUsers(suspended);
    } catch (e: any) {
      setError(e.message ?? "Failed to load security data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getAdminLoginHistory().then(setLoginHistory);
  }, []);

  async function handleUnsuspend(user: AdminUser) {
    setUnsuspending(user.id);
    try {
      await toggleUserSuspension(user.id, false, user.type);
      await load();
    } finally {
      setUnsuspending(null);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} cols={3} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  const statCards = [
    { label: "Suspended Clients", value: metrics?.suspendedClients ?? 0, icon: Ban, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Suspended Pros", value: metrics?.suspendedPros ?? 0, icon: Ban, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { label: "Pending Verifications", value: metrics?.pendingVerifications ?? 0, icon: ShieldCheck, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
    { label: "New Signups (7d)", value: metrics?.recentSignups7d ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Security Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Platform security health and account status</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Ban className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Suspended Accounts ({suspendedUsers.length})</h3>
        </div>
        {suspendedUsers.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground text-center">No suspended accounts</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {suspendedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{user.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">@{user.username}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{user.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.joinDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsuspend(user)}
                        disabled={unsuspending === user.id}
                        className="gap-1 text-xs h-7"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {unsuspending === user.id ? "Restoring…" : "Reinstate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Admin Login History</h3>
        </div>
        {loginHistory.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground text-center">
            No history yet — recorded from the next login onward.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 border-b border-border z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">#</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Admin ID</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">IP Address</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((record, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{record.name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={record.adminId ?? undefined}>
                      {record.adminId ? record.adminId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{record.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {record.ip ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(record.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Refund Requests View ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pro_approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro_declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending:      "Pending Pro",
  pro_approved: "Pro Approved",
  pro_declined: "Pro Declined",
  refunded:     "Refunded",
};

function AdminRefundRequestsView() {
  const [requests, setRequests] = useState<AdminReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "pro_approved" | "pro_declined" | "refunded">("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<AdminReturnRequest | null>(null);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [issuingId, setIssuingId] = useState<number | null>(null);

  async function openRequest(req: AdminReturnRequest) {
    setViewing(req);
    setEvidenceUrls([]);
    setLoadingEvidence(true);
    try {
      setEvidenceUrls(await fetchReturnEvidence(req.id));
    } catch {
    } finally {
      setLoadingEvidence(false);
    }
  }

  useEffect(() => {
    fetchAdminReturnRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleIssueRefund(req: AdminReturnRequest) {
    setIssuingId(req.id);
    try {
      // A "partial" approval carries the exact dollar amount the pro agreed
      // to refund — pass it through so Stripe only refunds that much,
      // leaving the rest (minus the platform's full commission, which is
      // still collected on a partial refund) for the pro's payout. Omitting
      // it (full refund) falls back to refunding the full base amount.
      const amount = req.refundType === "partial" ? (req.partialAmount ?? undefined) : undefined;
      if (req.orderId) {
        await issueOrderRefund(req.orderId, amount);
      } else if (req.bookingId) {
        await issueBookingRefund(req.bookingId, amount);
      }
      // No local status write or email here: this only initiates the Stripe
      // refund. stripe-webhook's handleChargeRefunded closes out this
      // pro_approved request to "refunded" and sends the client their
      // "Refund processed" email once Stripe's charge.refunded event
      // confirms the refund actually happened (same reasoning as
      // issueBookingRefund/issueOrderRefund not notifying directly).
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "refunded" } : r))
      );
      if (viewing?.id === req.id) setViewing((v) => v ? { ...v, status: "refunded" } : null);
    } catch {
    } finally {
      setIssuingId(null);
    }
  }

  const counts = {
    all:          requests.length,
    pending:      requests.filter((r) => r.status === "pending").length,
    pro_approved: requests.filter((r) => r.status === "pro_approved").length,
    pro_declined: requests.filter((r) => r.status === "pro_declined").length,
    refunded:     requests.filter((r) => r.status === "refunded").length,
  };

  const filtered = requests
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.proName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    });

  const tabs: { id: typeof filter; label: string }[] = [
    { id: "all",          label: "All" },
    { id: "pending",      label: "Pending Pro" },
    { id: "pro_approved", label: "Pro Approved" },
    { id: "pro_declined", label: "Pro Declined" },
    { id: "refunded",     label: "Refunded" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Refund Requests</h2>
          <p className="text-sm text-muted-foreground">
            Review client refund requests and issue refunds once approved by the pro.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Search client, pro, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${filter === tab.id ? "bg-white/20" : "bg-background"}`}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border bg-card text-center">
          <RefreshCw className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No refund requests found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "all" ? "Refund requests from clients will appear here." : `No ${STATUS_LABEL[filter] ?? filter} requests.`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Pro</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Refund</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((req) => {
                  const type = req.orderId ? "Order" : "Booking";
                  const linkedId = req.orderId
                    ? `#${String(req.orderId).padStart(6, "0")}`
                    : `#${req.bookingId?.slice(0, 8) ?? "—"}`;
                  const date = req.createdAt
                    ? new Date(req.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{req.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          type === "Order"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {type === "Order" ? <Package className="h-3 w-3" /> : <CalendarCheck className="h-3 w-3" />}
                          {type} {linkedId}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{req.clientName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{req.proName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status] ?? ""}`}>
                          {STATUS_LABEL[req.status] ?? req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {req.refundType === "partial"
                          ? <span className="text-amber-600 font-medium">Partial — ${req.partialAmount?.toFixed(2) ?? "0.00"}</span>
                          : req.refundType === "full"
                          ? <span className="text-emerald-600 font-medium">Full</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openRequest(req)}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {req.status === "pro_approved" && (
                            <button
                              onClick={() => handleIssueRefund(req)}
                              disabled={issuingId === req.id}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              <RefreshCw className="h-3 w-3" />
                              {issuingId === req.id ? "Issuing…" : "Issue Refund"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) { setViewing(null); setEvidenceUrls([]); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Refund Request #{viewing?.id}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-1">
              {/* Type & link */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {viewing.orderId ? <Package className="h-3.5 w-3.5 text-purple-500" /> : <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />}
                    {viewing.orderId
                      ? `Order #${String(viewing.orderId).padStart(6, "0")}`
                      : `Booking #${viewing.bookingId?.slice(0, 8)}`}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[viewing.status] ?? ""}`}>
                    {STATUS_LABEL[viewing.status] ?? viewing.status}
                  </span>
                </div>
              </div>

              {/* People */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Client</p>
                  <p className="text-sm font-medium">{viewing.clientName}</p>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Pro</p>
                  <p className="text-sm font-medium">{viewing.proName}</p>
                </div>
              </div>

              {/* Reason */}
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Reason from client</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{viewing.reason}</p>
              </div>

              {/* Refund decision */}
              {viewing.refundType && (
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Pro's refund decision</p>
                  <p className="text-sm font-medium">
                    {viewing.refundType === "full"
                      ? "Full refund"
                      : `Partial refund — $${viewing.partialAmount?.toFixed(2) ?? "0.00"}`}
                  </p>
                </div>
              )}

              {/* Evidence images */}
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Proof / Evidence</p>
                {loadingEvidence ? (
                  <p className="text-xs text-muted-foreground">Loading images…</p>
                ) : evidenceUrls.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No evidence uploaded</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {evidenceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
                        <img
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-32 object-cover"
                          onError={(e) => { (e.currentTarget.closest("a") as HTMLElement).style.display = "none"; }}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Submitted */}
              <p className="text-xs text-muted-foreground">
                Submitted {viewing.createdAt
                  ? new Date(viewing.createdAt).toLocaleDateString("en-US", {
                      weekday: "short", month: "long", day: "numeric", year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            {viewing?.status === "pro_approved" && (
              <Button
                disabled={issuingId === viewing.id}
                onClick={() => { if (viewing) handleIssueRefund(viewing); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {issuingId === viewing.id ? "Issuing…" : "Issue Refund"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Admin Contact Requests View ─────────────────────────────────────────────

function AdminContactRequestsView() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "replied">("all");
  const [replyingTo, setReplyingTo] = useState<ContactRequest | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchContactRequests());
    } catch (e: any) {
      setError(e.message ?? "Failed to load contact requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openReply(req: ContactRequest) {
    setReplyingTo(req);
    setReplyText("");
    setSendError(null);
  }

  async function handleSendReply() {
    if (!replyingTo || !replyText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await markContactRequestReplied(replyingTo, replyText.trim());
      setRequests((prev) =>
        prev.map((r) =>
          r.id === replyingTo.id
            ? { ...r, status: "replied", admin_reply: replyText.trim(), replied_at: new Date().toISOString() }
            : r,
        ),
      );
      setReplyingTo(null);
    } catch (e: any) {
      setSendError(e.message ?? "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  const filtered = requests.filter((r) => {
    if (statusFilter === "replied" && r.status !== "replied") return false;
    if (statusFilter === "new" && r.status === "replied") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.fullname.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCount = requests.length;
  const repliedCount = requests.filter((r) => r.status === "replied").length;
  const newCount = totalCount - repliedCount;

  if (loading) return <LoadingSkeleton rows={6} cols={5} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Contact Requests</h2>
          <p className="text-sm text-muted-foreground">Messages submitted via the contact form</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border bg-card p-2.5 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">{newCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting Reply</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{repliedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Replied</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name, email, or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | "new" | "replied")}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">Awaiting Reply</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No contact requests found
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id;
            const isReplied = req.status === "replied";
            return (
              <div key={req.id} className="bg-card">
                {/* Header row */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isReplied ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                    {isReplied
                      ? <MailOpen className={`h-4 w-4 text-green-600 dark:text-green-400`} />
                      : <Mail className={`h-4 w-4 text-amber-600 dark:text-amber-400`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{req.fullname}</span>
                      <span className="text-xs text-muted-foreground">{req.email}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isReplied ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                        {isReplied ? "Replied" : "New"}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5 truncate">{req.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="h-7 px-2.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      {isExpanded ? "Collapse" : "View"}
                    </button>
                    <button
                      onClick={() => openReply(req)}
                      className="h-7 px-2.5 rounded border border-border text-xs flex items-center gap-1 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      {isReplied ? "Re-reply" : "Reply"}
                    </button>
                  </div>
                </div>

                {/* Expanded message */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border/60 pt-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg px-4 py-3">{req.message}</p>
                    </div>
                    {isReplied && req.admin_reply && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Admin reply · {req.replied_at ? new Date(req.replied_at).toLocaleString() : ""}
                        </p>
                        <p className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-lg px-4 py-3">{req.admin_reply}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={(v) => { if (!v) setReplyingTo(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Reply to {replyingTo?.fullname}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              To: <span className="font-medium text-foreground">{replyingTo?.email}</span>
              {" · "}Re: <span className="font-medium text-foreground">{replyingTo?.subject}</span>
            </p>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {/* Original message reference */}
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Original message</p>
              <p className="text-sm text-foreground line-clamp-4">{replyingTo?.message}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your reply</label>
              <textarea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply here…"
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Clicking "Send Reply" will email this message to {replyingTo?.email ?? "the sender"} via Resend.
            </p>

            {sendError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{sendError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingTo(null)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={sending || !replyText.trim()}
              className="gap-2"
            >
              {sending ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Send Reply</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LoadingSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-3 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b border-border last:border-0 px-4 py-3 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 rounded bg-muted/60 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
      <p className="text-sm font-medium text-destructive">{message}</p>
      <p className="text-xs text-muted-foreground">
        This may be due to Row Level Security policies on this table.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}
