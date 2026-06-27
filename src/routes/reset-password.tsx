import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Hammer, ShieldCheck } from "lucide-react";
import bgImg from "@/assets/client-dashboard-bg.jpg";
import { supabase } from "@/lib/supabase";
import { updatePassword } from "@/backend/auth-reset";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — Capture Connect" },
      { name: "description", content: "Set a new password for your TradeHub account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (timeout) clearTimeout(timeout);
        setValidSession(true);
      }
    });

    // If the user already has an active recovery session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
      } else {
        // Wait briefly for the PASSWORD_RECOVERY event before marking invalid
        timeout = setTimeout(() => {
          setValidSession((prev) => (prev === null ? false : prev));
        }, 1500);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate({ to: "/" }), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid md:grid-cols-2">
      <aside className="relative hidden md:block overflow-hidden">
        <img
          src={bgImg}
          alt="Tradesperson on site"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 bg-background/50" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Set Your <span className="text-primary">New Password</span>
            </h1>
            <ul className="space-y-3 text-foreground/90">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                At least 8 characters
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Mix of letters and numbers
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Don't reuse your old password
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 text-foreground/70 text-sm">
            <Hammer className="h-5 w-5 text-primary" />
            Capture Connect
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          <Link
            to="/"
            className="md:hidden inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Set New Password</h2>
            <p className="text-muted-foreground text-sm">
              Choose a strong new password for your account.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Update Password
            </div>

            {validSession === null && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Verifying your reset link…
              </p>
            )}

            {validSession === false && (
              <div className="space-y-3">
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-3">
                  This reset link is invalid or has expired.
                </p>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Request a new reset link →
                </Link>
              </div>
            )}

            {validSession === true && !success && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Updating…" : "Update Password"}
                </Button>
              </form>
            )}

            {success && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-3">
                Password updated! Redirecting you to the home page…
              </p>
            )}
          </div>

          {!success && (
            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/client-login-signup" className="text-primary hover:underline">
                Back to login
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
