import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { adminLogin, setAdminAuthenticated, setAdminEmail, recordAdminLogin } from "@/backend/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [{ title: "Admin Login — TradeHub" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { ok, adminId } = await adminLogin(email, password);
    setLoading(false);
    if (ok) {
      setAdminAuthenticated(true);
      setAdminEmail(email);
      let ip: string | null = null;
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        ip = data.ip ?? null;
      } catch {}
      recordAdminLogin(email, adminId, ip);
      navigate({ to: "/admin-dashboard" });
    } else {
      toast.error("Invalid admin credentials.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Restricted access — TradeHub staff only
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@tradehub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
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
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Test Credentials
          </p>
          <p className="text-sm font-mono">admin@tradehub.com</p>
          <p className="text-sm font-mono">Admin@123456</p>
        </div>
      </div>
    </div>
  );
}
