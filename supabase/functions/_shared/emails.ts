// Shared server-side notification helpers for Edge Functions.
//
// The frontend's notify() (src/backend/notify.ts) can't be used here — it
// depends on the browser Supabase client, localStorage and the Notification
// API. This module mirrors its "critical" path (payment events are always
// critical — see notifications.ts CRITICAL_TYPES): always insert an in-app
// notification row and always send an email, using the same
// send-notification-email Edge Function the frontend uses.
//
// Email HTML itself is NOT built here — every template lives in
// src/backend/email-templates.ts (the single source of truth shared with the
// frontend dispatcher, src/backend/notification-emails.ts) and is re-exported
// below so existing imports of "../_shared/emails.ts" keep working unchanged.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export {
  APP_URL,
  buildPaymentReceivedClientEmail,
  buildPaymentReceivedProEmail,
  buildPaymentReceivedPendingCompletionProEmail,
  buildPaymentFailedEmail,
  buildRefundProcessedClientEmail,
  buildRefundProcessedProEmail,
  buildAdminPayoutsReadyAlertEmail,
} from "../../../src/backend/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

/** Sends an admin alert to every admin/super_admin in the `admin` table (service-role read, bypasses that table's RLS). */
export async function sendAdminAlert(admin: SupabaseClient, subject: string, html: string): Promise<void> {
  const { data, error } = await admin.from("admin").select("email").in("role", ["admin", "super_admin"]);
  if (error) {
    console.error("[emails] failed to load admin emails:", error);
    return;
  }
  const recipients = (data ?? []).map((row) => row.email as string).filter(Boolean);
  await Promise.all(recipients.map((to) => sendEmail(to, subject, html)));
}

// ── Dispatch ──────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[emails] send-notification-email failed:", res.status, text);
    }
  } catch (err) {
    console.error("[emails] failed to reach send-notification-email:", err);
  }
}

export interface NotifyInput {
  userId: string;
  userEmail: string | null;
  title: string;
  message: string;
  type: "payment" | "booking" | "admin";
  link?: string;
  emailHtml?: string;
  emailSubject?: string;
}

/** Server-side equivalent of src/backend/notify.ts for critical (payment) events. */
export async function notifyUser(admin: SupabaseClient, input: NotifyInput): Promise<void> {
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link ?? null,
  });
  if (error) {
    console.error("[emails] failed to insert notification:", error);
  }

  if (input.userEmail && input.emailHtml && input.emailSubject) {
    await sendEmail(input.userEmail, input.emailSubject, input.emailHtml);
  }
}
