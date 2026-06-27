import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Hammer, Mail } from "lucide-react";
import bgImg from "@/assets/client-dashboard.png";
import { requestPasswordReset } from "@/backend/auth-reset";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Capture Connect" },
      { name: "description", content: "Reset your TradeHub account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
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

          <div className="space-y-4 max-w-md">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Forgot Your <span className="text-primary">Password?</span>
            </h1>
            <p className="text-foreground/80 text-lg">
              No worries. Enter your email and we'll send you a secure link to reset it.
            </p>
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
            <h2 className="text-3xl font-bold">Reset Password</h2>
            <p className="text-muted-foreground text-sm">
              Enter the email address on your account and we'll send you a reset link.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Password Reset
            </div>

            {sent ? (
              <div className="space-y-4">
                <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-3">
                  Check your inbox! We've sent a reset link to{" "}
                  <strong>{email}</strong>. It may take a minute to arrive.
                </p>
                <p className="text-xs text-muted-foreground">
                  Didn't receive it? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/client-login-signup" className="text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
