import { supabase } from "@/lib/supabase";
import { requireAdminRole } from "@/backend/admin";
import {
  sendAdminAlertEmail,
  buildAdminContactRequestAlertEmail,
} from "@/backend/notification-emails";

export interface ContactRequestData {
  fullname: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactRequest {
  id: string;
  fullname: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  status?: string | null;
  admin_reply?: string | null;
  replied_at?: string | null;
}

export async function submitContactRequest(data: ContactRequestData): Promise<void> {
  const { error } = await supabase.from("contact_request").insert({
    fullname: data.fullname,
    email: data.email,
    subject: data.subject,
    message: data.message,
  });

  if (error) throw new Error(error.message);

  // Notify admin (fire-and-forget)
  const excerpt = data.message.length > 150
    ? data.message.slice(0, 150) + "…"
    : data.message;
  ;(async () => {
    await sendAdminAlertEmail(
      `New contact request: ${data.subject} — Capture Connect`,
      buildAdminContactRequestAlertEmail(data.fullname, data.email, data.subject, excerpt),
    );
  })().catch(() => {});
}

export async function fetchContactRequests(): Promise<ContactRequest[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("contact_request")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactRequest[];
}

export async function markContactRequestReplied(id: string, reply: string): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("contact_request")
    .update({ status: "replied", admin_reply: reply, replied_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
