import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getVerificationStatus } from "@/backend/pro-verification";
import { getAdminSettings } from "@/backend/admin";
import { toast } from "sonner";
import { SESSION_START_KEY } from "@/routes/__root";
import { requestBrowserPermission } from "@/lib/browser-notifications";

export const Route = createFileRoute("/auth-callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const url = new URL(window.location.href);
      const oauthError = url.searchParams.get("error");
      const oauthErrorDescription = url.searchParams.get("error_description");

      if (oauthError) {
        setError(oauthErrorDescription ? decodeURIComponent(oauthErrorDescription) : oauthError);
        return;
      }

      const code = url.searchParams.get("code");
      const type = url.searchParams.get("type") as "client" | "pro" | null;

      if (!code) {
        setError("Authentication failed. No authorization code was received.");
        return;
      }

      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      const user = exchangeData.user;
      if (!user) {
        setError("Authentication failed. Please try again.");
        return;
      }

      const fullName = (user.user_metadata?.full_name || user.user_metadata?.name || "") as string;
      const email = user.email ?? "";

      if (type === "client") {
        // Block deleted accounts before touching any profile data
        const { data: deletedRecord } = await supabase
          .from("deleted_accounts")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (deletedRecord) {
          await supabase.auth.signOut();
          setError("This account has been deleted and cannot be used to sign in.");
          return;
        }

        const { data: existingProfile } = await supabase
          .from("client_profiles")
          .select("id, active_role, account_status")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          // New user via OAuth — respect the registrations gate
          const settings = await getAdminSettings();
          if (!settings.allowRegistrations) {
            await supabase.auth.signOut();
            setError("New registrations are currently closed. Please check back later.");
            return;
          }
          const { error: profileError } = await supabase
            .from("client_profiles")
            .insert({ id: user.id, full_name: fullName, email, role: "client", account_status: "active", active_role: true });
          if (profileError) {
            setError(profileError.message);
            return;
          }
        } else {
          const isInactive = existingProfile.active_role === false || existingProfile.active_role === "false";
          if (isInactive) {
            await supabase.auth.signOut();
            setError("Your client account is currently inactive. Switch back to your client account from your pro dashboard settings.");
            return;
          }
          const status = (existingProfile.account_status as string | null)?.toLowerCase();
          if (status === "suspended") {
            await supabase.auth.signOut();
            setError("Your account has been suspended. Please contact support for assistance.");
            return;
          }
          if (status === "deactivated") {
            await supabase.auth.signOut();
            setError("Your account has been deactivated and cannot be used to sign in.");
            return;
          }
        }

        localStorage.setItem(SESSION_START_KEY, String(Date.now()));
        requestBrowserPermission(); // fire-and-forget; user sees the browser prompt once
        navigate({ to: "/client-dashboard" });
      } else if (type === "pro") {
        // Block deleted accounts before touching any profile data
        const { data: deletedRecord } = await supabase
          .from("deleted_accounts")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (deletedRecord) {
          await supabase.auth.signOut();
          setError("This account has been deleted and cannot be used to sign in.");
          return;
        }

        const { data: existingProfile } = await supabase
          .from("tradesperson_profiles")
          .select("id, active_role, account_status")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          // New user via OAuth — respect the registrations gate
          const settings = await getAdminSettings();
          if (!settings.allowRegistrations) {
            await supabase.auth.signOut();
            setError("New registrations are currently closed. Please check back later.");
            return;
          }
          const { error: profileError } = await supabase
            .from("tradesperson_profiles")
            .insert({ id: user.id, full_name: fullName, email, role: "tradesperson", account_status: "active", active_role: true });
          if (profileError) {
            setError(profileError.message);
            return;
          }
        } else {
          const isInactive = existingProfile.active_role === false || existingProfile.active_role === "false";
          if (isInactive) {
            await supabase.auth.signOut();
            setError("Your pro account is currently inactive. Switch back to your pro account from your client dashboard settings.");
            return;
          }
          const status = (existingProfile.account_status as string | null)?.toLowerCase();
          if (status === "suspended") {
            await supabase.auth.signOut();
            setError("Your account has been suspended. Please contact support for assistance.");
            return;
          }
          if (status === "deactivated") {
            await supabase.auth.signOut();
            setError("Your account has been deactivated and cannot be used to sign in.");
            return;
          }
        }

        const { status: verificationStatus } = await getVerificationStatus();
        if (verificationStatus === "none") {
          navigate({ to: "/pro-verification" });
        } else if (verificationStatus === "pending") {
          toast.warning("Your account is pending verification. You'll be notified once your documents are approved.");
          navigate({ to: "/" });
        } else if (verificationStatus === "rejected") {
          toast.error("Your verification was not approved. Please contact support for assistance.");
          navigate({ to: "/" });
        } else {
          localStorage.setItem(SESSION_START_KEY, String(Date.now()));
          requestBrowserPermission(); // fire-and-forget
          navigate({ to: "/pro-dashboard" });
        }
      } else {
        setError("Unknown account type. Please use the client or pro login page.");
      }
    }

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive text-center max-w-sm">{error}</p>
        <div className="flex gap-3 text-sm">
          <a href="/client-login-signup" className="text-primary hover:underline">Client login</a>
          <span className="text-muted-foreground">·</span>
          <a href="/pro-login-signup" className="text-primary hover:underline">Pro login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Completing sign in…</p>
    </div>
  );
}
