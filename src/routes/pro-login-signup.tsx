import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, Hammer, CheckCircle2 } from "lucide-react";
import bgImg from "@/assets/pro-dashboard-bg.jpg";
import { signUpTradesperson, signInTradesperson } from "@/backend/pro-auth";
import { getVerificationStatus } from "@/backend/pro-verification";
import { toast } from "sonner";

export const Route = createFileRoute("/pro-login-signup")({
  head: () => ({
    meta: [
      { title: "Tradesperson Login — TradeHub" },
      {
        name: "description",
        content:
          "Log in to your TradeHub pro account to manage bookings, message clients, and grow your trade business.",
      },
      { property: "og:title", content: "Tradesperson Login — TradeHub" },
      {
        property: "og:description",
        content:
          "Run your trade as a business — bookings, payments, and client messaging in one place.",
      },
    ],
  }),
  component: ProLoginPage,
});

function ProLoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await signUpTradesperson({ fullName, gender, dob, email, password });
        navigate({ to: "/pro-verification" });
      } else {
        await signInTradesperson({ email, password });
        const { status } = await getVerificationStatus();
        if (status === "none") {
          navigate({ to: "/pro-verification" });
        } else if (status === "pending") {
          toast.warning(
            "Your account is pending verification. You'll be notified once your documents are approved."
          );
          navigate({ to: "/" });
        } else if (status === "rejected") {
          toast.error(
            "Your verification was not approved. Please contact support for assistance."
          );
          navigate({ to: "/" });
        } else {
          navigate({ to: "/pro-dashboard" });
        }
      }
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
          alt="Tradesperson reviewing work on a tablet"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" />
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
              Your Trade. <span className="text-primary">Your Business.</span>
            </h1>
            <ul className="space-y-3 text-foreground/90">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Win more high-quality jobs
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Fast payouts with secure escrow
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Build your brand &amp; reputation
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 text-foreground/70 text-sm">
            <Hammer className="h-5 w-5 text-primary" />
            TradeHub for Pros
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
            <h2 className="text-3xl font-bold">
              {mode === "login" ? "Pro log in" : "Join as a pro"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "login"
                ? "Welcome back. Let's get you back on the tools."
                : "Set up your trade profile and start booking work today."}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-card p-1 w-full">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Tradesperson {mode === "login" ? "Login" : "Sign Up"}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Mike Hayes"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={gender} onValueChange={setGender} required>
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@trade.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {mode === "login" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
                    />
                  </div>
                </div>
              )}

              {success && (
                <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {success}
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading
                  ? "Please wait…"
                  : mode === "login"
                  ? "Sign In"
                  : "Create Pro Account"}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" size="lg" disabled>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Looking to hire?{" "}
            <Link to="/client-login-signup" className="text-primary hover:underline">
              Client login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
