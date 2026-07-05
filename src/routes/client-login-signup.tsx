import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import bgImg from "@/assets/client-dashboard.png";
import logoImg from "@/assets/logo-withoutBranding.png";
import { signUpClient, signInClient, signInWithGoogleClient } from "@/backend/client-auth";
import { getAdminSettings } from "@/backend/admin";
import { SESSION_START_KEY } from "@/routes/__root";
import { requestBrowserPermission } from "@/lib/browser-notifications";

export const Route = createFileRoute("/client-login-signup")({
  head: () => ({
    meta: [
      { title: "Client Dashboard — Capture Connect" },
      {
        name: "description",
        content:
          "Log in to your TradeHub client dashboard to hire vetted tradespeople, manage jobs, and pay securely.",
      },
      { property: "og:title", content: "Client Dashboard — Capture Connect" },
      {
        property: "og:description",
        content:
          "Hire verified tradespeople and manage every job from one secure dashboard.",
      },
    ],
  }),
  component: ClientDashboardPage,
});

function ClientDashboardPage() {
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
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAdminSettings().then((s) => setAllowRegistrations(s.allowRegistrations));
  }, []);

  function switchMode(next: "login" | "signup") {
    if (next === "signup" && !allowRegistrations) {
      setError("New registrations are currently closed. Please check back later.");
      return;
    }
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "signup" && !allowRegistrations) {
      setError("New registrations are currently closed. Please check back later.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (mode === "signup" && !termsAccepted) {
      setError("You must accept the Terms & Conditions to create an account.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpClient({ fullName, gender, dob, email, password });
        setSuccess("Account created! Redirecting to login…");
        setTimeout(() => switchMode("login"), 2000);
      } else {
        await signInClient({ email, password });
        localStorage.setItem(SESSION_START_KEY, String(Date.now()));
        requestBrowserPermission();
        navigate({ to: "/client-dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid md:grid-cols-2">
      {/* Left: image / pitch */}
      <aside className="relative hidden md:block overflow-hidden">
        <img
          src={bgImg}
          alt="Tradesperson on site reviewing job details"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white">
              Connecting You To <span className="text-amber-400">The Right Trade</span>
            </h1>
            <ul className="space-y-3 text-white/90">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                Vetted, licensed tradespeople
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                Secure booking & escrow payments
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                Real‑time job tracking & messaging
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={logoImg}
              alt="Capture Connect – TradeHub Marketplace"
              className="h-10 w-auto object-contain"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-white">Capture Connect</span>
              <span className="text-xs font-medium text-amber-400 tracking-wide">TradeHub Marketplace</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Right: auth */}
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
              {mode === "login" ? "Log in" : "Create your account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "login"
                ? "Welcome back. Manage your trade jobs in one place."
                : "Start hiring vetted tradespeople in minutes."}
            </p>
          </div>

          {/* Toggle */}
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
              Client {mode === "login" ? "Login" : "Sign Up"}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Jane Doe"
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
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {mode === "login" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
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

              {mode === "signup" && (
                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer select-none">
                    I have read and agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
                    >
                      Terms & Conditions
                    </button>
                  </label>
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
                {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
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

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              type="button"
              disabled={loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  await signInWithGoogleClient();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Something went wrong.");
                  setLoading(false);
                }
              }}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Please wait…" : "Continue with Google"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to TradeHub's{" "}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms & Conditions
            </button>{" "}
            and Privacy Policy.
          </p>
        </div>
      </main>

      {/* Terms & Conditions Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold">Terms & Conditions</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Effective date: June 2025 · TradeHub Client Agreement</p>
          </DialogHeader>

          <ScrollArea className="h-[55vh] px-6 py-5">
            <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Acceptance of Terms</h3>
                <p>By creating a TradeHub client account you confirm that you are at least 18 years old and have the legal capacity to enter into a binding agreement. If you register on behalf of a business, you warrant that you have authority to bind that business. Use of the platform constitutes acceptance of these Terms in full.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">2. Platform Overview</h3>
                <p>TradeHub is an online marketplace that connects clients with independent tradespeople ("Pros") for residential and commercial trade services including, but not limited to, plumbing, electrical work, carpentry, painting, tiling, and general construction. TradeHub acts solely as an intermediary and is not a party to any contract formed between a client and a Pro.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">3. Account Registration & Security</h3>
                <p>You must provide accurate, current, and complete information during registration and keep your account details up to date. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at captureconnects@gmail.com if you suspect unauthorised access.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">4. Booking & Hiring Tradespeople</h3>
                <p>When you submit a job request through TradeHub you are making an offer to hire a Pro under the terms displayed at the time of booking. A binding agreement is formed only when a Pro accepts your request and you confirm the booking. TradeHub does not guarantee the availability of any specific Pro or the completion of any job within a particular timeframe.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">5. Payments & Escrow</h3>
                <p>All payments are processed through TradeHub's secure escrow system. Funds are held until you confirm satisfactory completion of the agreed work, at which point payment is released to the Pro. If a dispute arises you must raise it through the in-platform dispute resolution process within 48 hours of the job completion date. TradeHub charges a platform service fee on each transaction; the fee amount is displayed before you confirm a booking.</p>
                <p>All prices are inclusive of applicable taxes unless otherwise stated. Refunds are subject to our Refund Policy.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">6. Purchasing Items from Sellers</h3>
                <p>In addition to hiring tradespeople, TradeHub allows sellers (including Pros and independent suppliers) to list physical goods and trade materials ("Items") for purchase. When you buy an Item through TradeHub you enter into a direct contract of sale with the seller; TradeHub acts solely as the platform facilitating the transaction and is not the seller of record.</p>
                <p><span className="font-medium text-foreground">Order Placement & Confirmation.</span> An order is placed when you complete checkout and receive an order confirmation. The seller has the right to cancel an order if the Item is out of stock or incorrectly priced, in which case a full refund will be issued within 5 business days.</p>
                <p><span className="font-medium text-foreground">Pricing & Payment.</span> All Item prices are displayed in the local currency and include applicable taxes unless stated otherwise. Payment is charged at checkout and held in escrow until you confirm receipt of the Item in satisfactory condition.</p>
                <p><span className="font-medium text-foreground">Delivery & Shipping.</span> Estimated delivery timeframes are provided by the seller and are not guaranteed by TradeHub. Risk of loss and title to Items passes to you upon delivery to the address specified at checkout. You are responsible for providing an accurate delivery address; TradeHub and sellers are not liable for failed deliveries due to incorrect address information.</p>
                <p><span className="font-medium text-foreground">Returns & Refunds.</span> You may request a return within 14 days of delivery if the Item is unused, in its original condition, and in original packaging. Items that are custom-made, perishable, or explicitly marked non-returnable are excluded. Return shipping costs are the buyer's responsibility unless the Item is faulty or not as described. Refunds are processed within 7 business days of the seller receiving the returned Item.</p>
                <p><span className="font-medium text-foreground">Faulty or Misrepresented Items.</span> If an Item arrives damaged, defective, or materially different from its listing description, you must report the issue through the in-platform dispute tool within 48 hours of delivery, including photographic evidence. TradeHub will mediate and, where the claim is upheld, arrange a full refund or replacement at no additional cost to you.</p>
                <p><span className="font-medium text-foreground">Seller Responsibility.</span> Sellers are solely responsible for the accuracy of Item listings, including descriptions, images, specifications, and compliance with applicable product safety laws. TradeHub does not inspect or warrant the quality, safety, or legality of any Item listed on the platform.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">7. Client Responsibilities</h3>
                <p>As a client you agree to:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/80">
                  <li>Provide accurate job descriptions, site addresses, and any relevant access information.</li>
                  <li>Ensure safe and lawful site conditions for the Pro and any required inspectors.</li>
                  <li>Be available (or have an authorised representative available) at the agreed appointment time.</li>
                  <li>Communicate exclusively through the TradeHub messaging system for all job-related discussions.</li>
                  <li>Not solicit or accept off-platform payments to circumvent TradeHub's fee structure.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">8. Reviews & Ratings</h3>
                <p>After a job is marked complete you may leave a review for the Pro. Reviews must be honest, first-hand, and free from discriminatory, defamatory, or abusive content. TradeHub reserves the right to remove reviews that violate these standards. You must not offer or accept incentives in exchange for reviews.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">9. Prohibited Conduct</h3>
                <p>You must not use TradeHub to:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/80">
                  <li>Post false, misleading, or fraudulent job requests.</li>
                  <li>Harass, threaten, or discriminate against any Pro or other user.</li>
                  <li>Attempt to gain unauthorised access to TradeHub systems or data.</li>
                  <li>Engage in any activity that violates applicable law or regulation.</li>
                  <li>Use automated tools to scrape, crawl, or extract data from the platform.</li>
                </ul>
                <p>Violation of these rules may result in immediate account suspension or termination.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">10. Dispute Resolution</h3>
                <p>In the event of a dispute with a Pro, you must first attempt resolution through TradeHub's in-platform mediation tool. If mediation fails, disputes shall be subject to binding arbitration in accordance with the rules of the relevant arbitration body in your jurisdiction, except where prohibited by local law. Nothing in this clause limits your statutory consumer rights.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">11. Limitation of Liability</h3>
                <p>To the fullest extent permitted by law, TradeHub's aggregate liability to you for any claim arising out of or related to these Terms or the platform shall not exceed the total fees paid by you to TradeHub in the 12 months preceding the claim. TradeHub is not liable for any indirect, incidental, consequential, or punitive damages. TradeHub does not warranty the quality, safety, or legality of services provided by Pros.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">12. Privacy & Data</h3>
                <p>Your personal data is processed in accordance with TradeHub's Privacy Policy. By accepting these Terms you consent to the collection, use, and storage of your data as described therein, including sharing necessary details with Pros to facilitate bookings.</p>
                <p><span className="font-medium text-foreground">Data Retention After Account Deletion.</span> When you delete your account, certain information is retained for up to 12 months from the date of deletion. This includes transaction records, payment history, booking details, dispute correspondence, and any communications required for legal, regulatory, or fraud-prevention purposes. After the 12-month retention period, this data is permanently and irreversibly deleted from our systems, except where a longer retention period is required by applicable law. During the retention period your data will not be used for marketing and will not be accessible to you via the platform.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">13. Modifications to Terms</h3>
                <p>TradeHub may update these Terms from time to time. Where changes are material we will notify you by email or in-app notification at least 14 days before the new Terms take effect. Continued use of the platform after that date constitutes acceptance of the revised Terms.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">14. Termination</h3>
                <p>You may close your account at any time via your account settings. TradeHub may suspend or terminate your account immediately if you breach these Terms, engage in fraudulent activity, or if required by law. Outstanding payment obligations survive termination.</p>
                <p>Upon account deletion, certain data — including transaction records, payment history, booking details, and dispute correspondence — is retained for up to 12 months for legal, regulatory, and fraud-prevention purposes, as described in Section 12 (Privacy & Data). This retained data is not accessible via the platform and is not used for any commercial purpose during this period.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">15. Governing Law</h3>
                <p>These Terms are governed by and construed in accordance with applicable law. Any disputes not resolved by arbitration shall be subject to the exclusive jurisdiction of the courts in the relevant territory.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">16. Contact</h3>
                <p>For questions about these Terms, contact us at <span className="text-primary">captureconnects@gmail.com</span> or through the Help Centre in your dashboard.</p>
              </section>

            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={() => { setTermsAccepted(true); setTermsOpen(false); }}
            >
              I Accept
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}