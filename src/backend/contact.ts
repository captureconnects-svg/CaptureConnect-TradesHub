import { supabase } from "@/lib/supabase";
import { requireAdminRole } from "@/backend/admin";

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
