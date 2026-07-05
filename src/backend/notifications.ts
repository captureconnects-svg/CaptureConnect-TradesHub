import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | "booking"
  | "payment"
  | "message"
  | "review"
  | "verification"
  | "admin";

export type NotificationPriority = "critical" | "medium" | "low";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  isRead: boolean;
  emailSent: boolean;
  browserSent: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  messageUpdates: boolean;
  reviewUpdates: boolean;
  marketingUpdates: boolean;
  browserNotifications: boolean;
  emailNotifications: boolean;
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  priority?: NotificationPriority;
  /** Set true after browser notification was fired (avoids double-send). */
  browserSent?: boolean;
  /** Set true after email was dispatched. */
  emailSent?: boolean;
}

// ── Row shapes returned from Supabase ──────────────────────────────────────

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  email_sent: boolean;
  browser_sent: boolean;
  created_at: string;
};

type PreferencesRow = {
  user_id: string;
  booking_updates: boolean;
  payment_updates: boolean;
  message_updates: boolean;
  review_updates: boolean;
  marketing_updates: boolean;
  browser_notifications: boolean;
  email_notifications: boolean;
};

// ── Mappers ────────────────────────────────────────────────────────────────

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type as NotificationType,
    link: row.link,
    isRead: row.is_read,
    emailSent: row.email_sent,
    browserSent: row.browser_sent,
    createdAt: row.created_at,
  };
}

function mapPreferences(row: PreferencesRow): NotificationPreferences {
  return {
    userId: row.user_id,
    bookingUpdates: row.booking_updates,
    paymentUpdates: row.payment_updates,
    messageUpdates: row.message_updates,
    reviewUpdates: row.review_updates,
    marketingUpdates: row.marketing_updates,
    browserNotifications: row.browser_notifications,
    emailNotifications: row.email_notifications,
  };
}

// ── Core CRUD ──────────────────────────────────────────────────────────────

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link ?? null,
      browser_sent: input.browserSent ?? false,
      email_sent: input.emailSent ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapNotification(data as NotificationRow);
}

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as NotificationRow[]).map(mapNotification);
}

export async function getUnreadCount(): Promise<number> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authData.user.id)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw new Error(error.message);
}

export async function markAllAsRead(): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", authData.user.id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
}

export async function markBrowserSent(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ browser_sent: true })
    .eq("id", notificationId);
}

export async function markEmailSent(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ email_sent: true })
    .eq("id", notificationId);
}

// ── Preferences ────────────────────────────────────────────────────────────

const DEFAULT_PREFS: Omit<NotificationPreferences, "userId"> = {
  bookingUpdates: true,
  paymentUpdates: true,
  messageUpdates: true,
  reviewUpdates: true,
  marketingUpdates: false,
  browserNotifications: true,
  emailNotifications: true,
};

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!data) return { userId: authData.user.id, ...DEFAULT_PREFS };
  return mapPreferences(data as PreferencesRow);
}

export async function upsertNotificationPreferences(
  prefs: Partial<Omit<NotificationPreferences, "userId">>
): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: authData.user.id,
      booking_updates: prefs.bookingUpdates ?? true,
      payment_updates: prefs.paymentUpdates ?? true,
      message_updates: prefs.messageUpdates ?? true,
      review_updates: prefs.reviewUpdates ?? true,
      marketing_updates: prefs.marketingUpdates ?? false,
      browser_notifications: prefs.browserNotifications ?? true,
      email_notifications: prefs.emailNotifications ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);
}

// ── Priority helpers ───────────────────────────────────────────────────────

export const CRITICAL_TYPES: NotificationType[] = ["payment", "admin"];
export const MEDIUM_TYPES: NotificationType[] = ["booking", "verification"];
export const LOW_TYPES: NotificationType[] = ["message", "review"];

export function getNotificationPriority(type: NotificationType): NotificationPriority {
  if (CRITICAL_TYPES.includes(type)) return "critical";
  if (MEDIUM_TYPES.includes(type)) return "medium";
  return "low";
}
