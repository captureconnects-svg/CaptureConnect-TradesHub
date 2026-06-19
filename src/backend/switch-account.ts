import { supabase } from "@/lib/supabase";

export async function switchToClient(): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;
  const meta = authData.user.user_metadata ?? {};
  const fullName = (meta.full_name as string) ?? "";
  const email = authData.user.email ?? "";

  // Deactivate pro role
  const { data: proProfile } = await supabase
    .from("tradesperson_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (proProfile) {
    const { error } = await supabase
      .from("tradesperson_profiles")
      .update({ active_role: false })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("tradesperson_profiles")
      .insert({ id: userId, full_name: fullName, email, active_role: false });
    if (error) throw new Error(error.message);
  }

  // Activate client role — create record if none exists
  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (clientProfile) {
    const { error } = await supabase
      .from("client_profiles")
      .update({ active_role: true })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("client_profiles")
      .insert({ id: userId, full_name: fullName, email, active_role: true });
    if (error) throw new Error(error.message);
  }
}

export async function switchToPro(): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;
  const meta = authData.user.user_metadata ?? {};
  const fullName = (meta.full_name as string) ?? "";
  const email = authData.user.email ?? "";

  // Activate pro role — create record if none exists
  const { data: proProfile } = await supabase
    .from("tradesperson_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (proProfile) {
    const { error } = await supabase
      .from("tradesperson_profiles")
      .update({ active_role: true })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("tradesperson_profiles")
      .insert({ id: userId, full_name: fullName, email, active_role: true });
    if (error) throw new Error(error.message);
  }

  // Deactivate client role
  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (clientProfile) {
    const { error } = await supabase
      .from("client_profiles")
      .update({ active_role: false })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("client_profiles")
      .insert({ id: userId, full_name: fullName, email, active_role: false });
    if (error) throw new Error(error.message);
  }
}
