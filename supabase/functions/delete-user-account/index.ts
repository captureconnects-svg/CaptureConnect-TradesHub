/**
 * delete-user-account Edge Function
 *
 * POST /functions/v1/delete-user-account
 * Headers: Authorization: Bearer <supabase admin access token>
 * Body: { userId: string }
 *
 * Admin-gated. Revokes the target user's Supabase Auth account so they can
 * never sign in again — the part of "delete user" that src/backend/admin.ts's
 * deleteAdminUser() cannot do itself (it only has the anon-key client, and
 * auth.admin.* calls require the service-role key, which never ships to the
 * frontend). deleteAdminUser() still does everything else (deleting
 * client_profiles/tradesperson_profiles and secondary rows, writing the
 * deleted_accounts tombstone) — this function is called from there, after
 * the tombstone is written, as the step that closes off future logins.
 *
 * There are no foreign keys from public.* to auth.users in this schema (all
 * cross-references are loose uuid columns, checked by RLS/app code, not by
 * the database), so a hard delete here is safe — it cannot cascade-delete or
 * null out any booking/payment/review history.
 *
 * Note: this revokes future logins and refresh-token use, but a session
 * token issued before this call remains cryptographically valid until it
 * expires (Supabase access tokens are stateless JWTs — PostgREST checks the
 * signature, not live auth.users state). The corresponding RLS tightening in
 * supabase/deleted_account_data_access_hardening_2026-07-21.sql is what
 * closes that residual window, by making the deleted user's own historical
 * rows stop matching their SELECT policies the moment their profile row is
 * gone, regardless of whether their old token is still technically valid.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import { resolveAdmin } from "../_shared/adminAuth.ts";

interface DeleteUserAccountRequest {
  userId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server misconfigured." }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const authorizedAdmin = await resolveAdmin(admin, req.headers.get("Authorization"));
  if (!authorizedAdmin) {
    return jsonResponse({ error: "Unauthorized: admin role required." }, 403);
  }

  let body: DeleteUserAccountRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!body.userId) {
    return jsonResponse({ error: "userId is required." }, 400);
  }

  // An admin can't delete their own admin login this way, and can't delete
  // another admin's auth account through the user-management panel — that
  // would be a privilege-escalation shortcut (delete a fellow admin's
  // account, then re-register the same email as a plain client/pro). The
  // `admin` table is keyed by email, not by auth user id (see adminAuth.ts),
  // so the target's email has to be looked up first.
  if (body.userId === authorizedAdmin.userId) {
    return jsonResponse({ error: "Cannot delete your own account." }, 400);
  }
  const { data: targetUser } = await admin.auth.admin.getUserById(body.userId);
  const targetEmail = targetUser?.user?.email;
  if (targetEmail) {
    const { data: targetIsAdmin } = await admin
      .from("admin")
      .select("id")
      .eq("email", targetEmail)
      .maybeSingle();
    if (targetIsAdmin) {
      return jsonResponse({ error: "Cannot delete an admin account through this endpoint." }, 400);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(body.userId);
  if (error) {
    // Supabase Auth is idempotent-ish here — if the account is already gone
    // (e.g. a retry after a partial failure), treat it as success.
    if (!/not.*found/i.test(error.message)) {
      console.error("[delete-user-account] failed to delete auth user", body.userId, error);
      return jsonResponse({ error: error.message }, 502);
    }
  }

  return jsonResponse({ deleted: true });
});
