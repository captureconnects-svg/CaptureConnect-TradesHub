// Server-side admin authorization for Edge Functions. Mirrors the check
// requireAdminRole() performs client-side in src/backend/admin.ts (the
// `admin` table, keyed by email, with role in admin/super_admin) — that
// frontend helper can't be imported here (different runtime/module graph),
// so the same check is reimplemented against the service-role client.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ROLES = ["admin", "super_admin"];

export interface AuthorizedAdmin {
  userId: string;
  email: string;
}

/** Resolves the bearer token to a Supabase user, then verifies they're an admin. Returns null if either check fails. */
export async function resolveAdmin(admin: SupabaseClient, authHeader: string | null): Promise<AuthorizedAdmin | null> {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.email) return null;

  const email = userData.user.email;
  const { data: adminRecord } = await admin
    .from("admin")
    .select("role")
    .eq("email", email)
    .in("role", ALLOWED_ROLES)
    .maybeSingle();

  if (!adminRecord) return null;

  return { userId: userData.user.id, email };
}
