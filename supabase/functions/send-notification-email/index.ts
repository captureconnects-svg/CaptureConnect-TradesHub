/**
 * send-notification-email Edge Function
 *
 * POST /functions/v1/send-notification-email
 * Headers: Authorization: Bearer <supabase_anon_or_service_key>
 * Body: { to: string, subject: string, html: string, notificationId?: string }
 *
 * Requires RESEND_API_KEY set as a Supabase secret:
 *   supabase secrets set RESEND_API_KEY=re_...
 *
 * After sending, optionally marks the notification row as email_sent = true.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API = "https://api.resend.com/emails";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  notificationId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "Capture Connect <noreply@captureconnect.app>";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!RESEND_API_KEY) {
    return json({ error: "Email service not configured." }, 503);
  }

  let body: SendEmailRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { to, subject, html, notificationId } = body;

  if (!to || !subject || !html) {
    return json({ error: "Missing required fields: to, subject, html." }, 400);
  }

  // Send via Resend
  const resendRes = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!resendRes.ok) {
    const errorText = await resendRes.text().catch(() => "");
    console.error("Resend error:", resendRes.status, errorText);
    return json({ error: "Failed to send email. Try again later." }, 502);
  }

  const result = await resendRes.json();

  // Mark notification as email_sent = true (best-effort)
  if (notificationId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await admin
        .from("notifications")
        .update({ email_sent: true })
        .eq("id", notificationId);
    } catch (err) {
      console.error("Failed to mark email_sent:", err);
    }
  }

  return json({ id: result.id });
});
