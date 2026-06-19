import { supabase } from "@/lib/supabase";

export interface ProProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  displayName: string;
}

export async function getProProfile(): Promise<ProProfile | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const meta = data.user.user_metadata ?? {};
  const username = (meta.username as string | undefined) ?? "";
  const fullName = (meta.full_name as string | undefined) ?? "";
  const email = data.user.email ?? "";
  const displayName = username || fullName || email;

  return { id: data.user.id, username, fullName, email, displayName };
}
