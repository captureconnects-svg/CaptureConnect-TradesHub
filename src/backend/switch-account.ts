import { supabase } from "@/lib/supabase";
import { sendNotificationEmail, buildSwitchedToClientEmail, buildSwitchedToProEmail } from "@/backend/notification-emails";

// ─── Switch: Pro → Client ────────────────────────────────────────────────────
// The ONLY code path that creates a client_profiles record for a pro user.
// Step 1: create / re-activate the client profile.
// Step 2: deactivate the pro profile (after the client record is confirmed ready).
// User is signed out and must re-login via the client login page.
export async function switchToClientAccount(): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;

  const { data: proProfile } = await supabase
    .from("tradesperson_profiles")
    .select("full_name, email, username, date_of_birth, gender, location")
    .eq("id", userId)
    .maybeSingle();

  const p = proProfile as Record<string, unknown> | null;

  // Step 1 — create or re-activate the client profile
  const { data: existingClient } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingClient) {
    const { error } = await supabase
      .from("client_profiles")
      .update({ active_role: true, account_status: "active" })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("client_profiles").insert({
      id: userId,
      full_name: p?.full_name ?? authData.user.user_metadata?.full_name ?? "",
      email: p?.email ?? authData.user.email ?? "",
      username: p?.username ?? null,
      date_of_birth: p?.date_of_birth ?? null,
      gender: p?.gender ?? null,
      location: p?.location ?? null,
      role: "client",
      account_status: "active",
      active_role: true,
    });
    if (error) throw new Error(error.message);
  }

  // Step 2 — deactivate the pro profile now that client is confirmed ready
  const { error: deactivateError } = await supabase
    .from("tradesperson_profiles")
    .update({ active_role: false, account_status: "deactivated" })
    .eq("id", userId);
  if (deactivateError) throw new Error(deactivateError.message);

  // Send confirmation email before signing out (fire-and-forget)
  const displayName = String(p?.full_name ?? authData.user.user_metadata?.full_name ?? "there");
  const userEmail = String(p?.email ?? authData.user.email ?? "");
  if (userEmail) {
    sendNotificationEmail({
      to: userEmail,
      subject: "You've switched to your Client account — Capture Connect",
      html: buildSwitchedToClientEmail(displayName),
    }).catch(() => {});
  }

  await supabase.auth.signOut();
}

// ─── Switch: Client → Pro ────────────────────────────────────────────────────
// The ONLY code path that creates a tradesperson_profiles record for a client user.
// Step 1: create / re-activate the pro profile.
// Step 2: deactivate the client profile (after the pro record is confirmed ready).
// User is signed out and must re-login via the pro login page.
export async function switchToProAccount(): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;

  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("full_name, email, username, date_of_birth, gender, location")
    .eq("id", userId)
    .maybeSingle();

  const p = clientProfile as Record<string, unknown> | null;

  // Step 1 — create or re-activate the pro profile
  const { data: existingPro } = await supabase
    .from("tradesperson_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingPro) {
    const { error } = await supabase
      .from("tradesperson_profiles")
      .update({ active_role: true, account_status: "active" })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tradesperson_profiles").insert({
      id: userId,
      full_name: p?.full_name ?? authData.user.user_metadata?.full_name ?? "",
      email: p?.email ?? authData.user.email ?? "",
      username: p?.username ?? null,
      date_of_birth: p?.date_of_birth ?? null,
      gender: p?.gender ?? null,
      location: p?.location ?? null,
      role: "tradesperson",
      account_status: "active",
      active_role: true,
    });
    if (error) throw new Error(error.message);
  }

  // Step 2 — deactivate the client profile now that pro is confirmed ready
  const { error: deactivateError } = await supabase
    .from("client_profiles")
    .update({ active_role: false, account_status: "deactivated" })
    .eq("id", userId);
  if (deactivateError) throw new Error(deactivateError.message);

  // Send confirmation email before signing out (fire-and-forget)
  const displayName = String(p?.full_name ?? authData.user.user_metadata?.full_name ?? "there");
  const userEmail = String(p?.email ?? authData.user.email ?? "");
  if (userEmail) {
    sendNotificationEmail({
      to: userEmail,
      subject: "You've switched to your Pro account — Capture Connect",
      html: buildSwitchedToProEmail(displayName),
    }).catch(() => {});
  }

  await supabase.auth.signOut();
}
