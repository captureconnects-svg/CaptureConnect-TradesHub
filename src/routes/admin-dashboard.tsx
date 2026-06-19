import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
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
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/admin-dashboard")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — TradeHub" }],
  }),
  component: AdminDashboardPage,
});

type View =
  | "overview"
  | "users"
  | "bookings"
  | "reviews"
  | "orders"
  | "verifications"
  | "testimonials"
  | "audit-logs"
  | "admin-settings"
  | "security-overview";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "verifications", label: "Verifications", icon: BadgeCheck },
  { id: "testimonials", label: "Testimonials", icon: Film },
];

const AUDIT_NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "audit-logs", label: "Logs", icon: ScrollText },
  { id: "admin-settings", label: "Settings", icon: Settings },
  { id: "security-overview", label: "Security Overview", icon: ShieldAlert },
];

function AdminDashboardPage() {
  const [view, setView] = useState<View>("overview");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate({ to: "/admin-login" });
    }
  }, []);

  function handleLogout() {
    setAdminAuthenticated(false);
    navigate({ to: "/admin-login" });
  }

  if (!isAdminAuthenticated()) return null;

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
            {view === "verifications" && <AdminVerificationsView />}
            {view === "testimonials" && <AdminTestimonialsView />}
            {view === "audit-logs" && <AdminAuditLogsView />}
            {view === "admin-settings" && <AdminSettingsView />}
            {view === "security-overview" && <AdminSecurityOverviewView />}
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
      setUsers((prev) =>
        prev.map((u) => u.id === user.id && u.type === user.type ? { ...u, status: "Deleted" } : u),
      );
      setTimeout(() => {
        setUsers((prev) => prev.filter((u) => !(u.id === user.id && u.type === user.type)));
      }, 1200);
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

  const filtered = users.filter((u) => {
    if (typeFilter !== "All" && u.type !== typeFilter) return false;
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
                          disabled={suspendingId === user.id}
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
                          disabled={deletingId === user.id}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
                          title="Delete user"
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

        <div className="shrink-0 pt-3 flex justify-end">
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

  const totalCount = bookings.length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Bookings" value={totalCount} color="text-blue-600 dark:text-blue-400" icon={CalendarCheck} iconColor="text-blue-500" />
        <StatCard label="Completed" value={completedCount} color="text-green-600 dark:text-green-400" icon={ShieldCheck} iconColor="text-green-500" />
        <StatCard label="Cancelled" value={cancelledCount} color="text-red-600 dark:text-red-400" icon={XCircle} iconColor="text-red-500" />
        <StatCard label="Confirmed" value={confirmedCount} color="text-purple-600 dark:text-purple-400" icon={Clock} iconColor="text-purple-500" />
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
                        {booking.refunded ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Refunded
                          </span>
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
            <BookingDetailRow label="Tax">
              <span>${order.tax.toFixed(2)}</span>
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

        <div className="shrink-0 pt-3 flex justify-end">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Orders" value={totalCount} color="text-blue-600 dark:text-blue-400" icon={ShoppingBag} iconColor="text-blue-500" />
        <StatCard label="Delivered" value={deliveredCount} color="text-green-600 dark:text-green-400" icon={ShieldCheck} iconColor="text-green-500" />
        <StatCard label="Pending Delivery" value={deliveryPendingCount} color="text-yellow-600 dark:text-yellow-400" icon={Truck} iconColor="text-yellow-500" />
        <StatCard label="Pickup Orders" value={pickupCount} color="text-purple-600 dark:text-purple-400" icon={Package} iconColor="text-purple-500" />
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
                  {["Order #", "Customer", "Email", "Method", "Total", "Delivered", "Date", "Actions"].map((col) => (
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
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());
  const [saved, setSaved] = useState(false);
  const adminEmail = getAdminEmail();

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

  function handleSave() {
    saveAdminSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide configuration</p>
      </div>

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

      <Button onClick={handleSave} className="gap-2">
        {saved ? <><CheckCircle className="h-4 w-4" /> Saved</> : "Save Settings"}
      </Button>
    </div>
  );
}

// ─── Admin Audit: Security Overview ──────────────────────────────────────────

function AdminSecurityOverviewView() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [suspendedUsers, setSuspendedUsers] = useState<AdminUser[]>([]);
  const [loginHistory] = useState<AdminLoginRecord[]>(() => getAdminLoginHistory());
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

  useEffect(() => { load(); }, []);

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
