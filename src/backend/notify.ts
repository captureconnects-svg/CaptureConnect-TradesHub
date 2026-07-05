/**
 * notify.ts — unified notification entry point
 *
 * Every notification in the app must go through `notify()`.
 * It handles:
 *   1. Inserting into the notifications table (always)
 *   2. Delivery rules based on priority
 *   3. Respecting notification_preferences before sending email / browser alerts
 *
 * Priority rules:
 *   critical → DB + toast + browser + email (always)
 *   medium   → DB + toast + browser + email only if user inactive > INACTIVITY_THRESHOLD_MS
 *   low      → DB only (in-app real-time subscription shows the toast)
 *
 * Toast and browser notifications for realtime events are handled by
 * useNotifications (the Supabase Realtime subscription). The dispatcher
 * here marks browser_sent = true when it fires one proactively for
 * critical/medium events that arrive outside the hook (e.g., from a
 * server-side trigger context where the hook is not running).
 */

import { supabase } from "@/lib/supabase";
import {
  createNotification,
  getNotificationPreferences,
  getNotificationPriority,
  markEmailSent,
  type NotificationType,
} from "@/backend/notifications";
import { sendNotificationEmail } from "@/backend/notification-emails";
import {
  getBrowserPermission,
  showBrowserNotification,
} from "@/lib/browser-notifications";
import { markBrowserSent } from "@/backend/notifications";

// 45 minutes of inactivity triggers an email for medium-priority events
const INACTIVITY_THRESHOLD_MS = 45 * 60 * 1_000;
const LAST_ACTIVE_KEY = "tradehub-last-active";

// ── Activity tracking ──────────────────────────────────────────────────────

export function recordActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (SSR / private mode edge case)
  }
}

function isUserInactive(): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? "0");
    if (!last) return true;
    return Date.now() - last > INACTIVITY_THRESHOLD_MS;
  } catch {
    return true;
  }
}

// ── Main dispatcher ────────────────────────────────────────────────────────

export interface NotifyInput {
  /** Target user's Supabase auth uid. */
  userId: string;
  /** User's email address (needed to send email). */
  userEmail?: string;
  title: string;
  message: string;
  type: NotificationType;
  /** Internal route (e.g. "/client-dashboard/bookings") or null. */
  link?: string;
  /** Pre-built HTML for the email body. Leave undefined to skip email even for critical events. */
  emailHtml?: string;
  /** Email subject line. Required when emailHtml is provided. */
  emailSubject?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  const priority = getNotificationPriority(input.type);

  // ── 1. Check if this is a cross-user notification ─────────────────────
  const { data: authData } = await supabase.auth.getUser();
  const isSelf = authData.user?.id === input.userId;

  // ── 2. Persist the notification (best-effort) ─────────────────────────
  // RLS only allows inserting user_id = auth.uid(), so cross-user inserts
  // will be blocked. We catch and continue so the email still fires.
  let notificationId: string | null = null;
  try {
    const notification = await createNotification({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link,
    });
    notificationId = notification.id;
  } catch {
    // Cross-user RLS block — proceed to email without a DB record.
  }

  // ── 3. Fetch preferences (best-effort — default to all-on on error) ───
  let prefs = await getNotificationPreferences().catch(() => null);

  if (!isSelf) {
    // Cross-user: cannot read the target user's preferences via client SDK.
    // Default to all channels enabled.
    prefs = null;
  }

  const wantsBrowser = prefs ? prefs.browserNotifications : true;
  const wantsEmail = prefs ? prefs.emailNotifications : true;

  // ── 4. Browser notification (only when permission is already granted) ─
  if (
    isSelf &&
    priority !== "low" &&
    wantsBrowser &&
    getBrowserPermission() === "granted"
  ) {
    const fired = showBrowserNotification({
      title: input.title,
      body: input.message,
      link: input.link,
    });
    if (fired && notificationId) {
      await markBrowserSent(notificationId).catch(() => {});
    }
  }

  // ── 5. Email ───────────────────────────────────────────────────────────
  const shouldEmail =
    wantsEmail &&
    !!input.emailHtml &&
    !!input.userEmail &&
    !!input.emailSubject;

  if (shouldEmail) {
    const emailNeeded =
      priority === "critical" ||
      // Cross-user: always send (can't check target's inactivity from client SDK).
      // Self: only send if the user has been inactive long enough.
      (priority === "medium" && (!isSelf || isUserInactive()));

    if (emailNeeded) {
      try {
        await sendNotificationEmail({
          to: input.userEmail!,
          subject: input.emailSubject!,
          html: input.emailHtml!,
          notificationId: notificationId ?? undefined,
        });
        if (notificationId) {
          await markEmailSent(notificationId).catch(() => {});
        }
      } catch (err) {
        console.error("[notify] email send failed:", err);
      }
    }
  }
}
