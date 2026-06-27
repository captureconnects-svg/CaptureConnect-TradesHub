import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ShieldCheck, Hammer, CheckCircle2 } from "lucide-react";
import bgImg from "@/assets/pro-dashboard.png"
import { signUpTradesperson, signInTradesperson, signInWithGooglePro } from "@/backend/pro-auth";
import { getVerificationStatus } from "@/backend/pro-verification";
import { toast } from "sonner";
import { getAdminSettings } from "@/backend/admin";
import { SESSION_START_KEY } from "@/routes/__root";

export const Route = createFileRoute("/pro-login-signup")({
  head: () => ({
    meta: [
      { title: "Tradesperson Login — Capture Connect" },
      {
        name: "description",
        content:
          "Log in to your TradeHub pro account to manage bookings, message clients, and grow your trade business.",
      },
      { property: "og:title", content: "Tradesperson Login — Capture Connect" },
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
        await signUpTradesperson({ fullName, gender, dob, email, password });
        navigate({ to: "/pro-verification" });
      } else {
        await signInTradesperson({ email, password });
        localStorage.setItem(SESSION_START_KEY, String(Date.now()));
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
              Your Trade. <span className="text-amber-400">Your Business.</span>
            </h1>
            <ul className="space-y-3 text-white/90">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                Win more high-quality jobs
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                Fast payouts with secure escrow
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                Build your brand &amp; reputation
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Hammer className="h-5 w-5 text-amber-400" />
            Capture Connect for Pros
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
                  await signInWithGooglePro();
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

          <p className="text-center text-xs text-muted-foreground">
            Looking to hire?{" "}
            <Link to="/client-login-signup" className="text-primary hover:underline">
              Client login
            </Link>
          </p>
        </div>
      </main>

      {/* Pro Terms & Conditions Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold">Terms & Conditions</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Effective date: June 2025 · TradeHub Pro Agreement</p>
          </DialogHeader>

          <ScrollArea className="h-[55vh] px-6 py-5">
            <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Acceptance of Terms</h3>
                <p>By registering as a tradesperson ("Pro") on TradeHub you confirm that you are at least 18 years old, legally authorised to work in your jurisdiction, and have the legal capacity to enter into a binding agreement. If you register on behalf of a business, you warrant that you have authority to bind that business. Use of the platform constitutes full acceptance of these Terms.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">2. Platform Overview</h3>
                <p>TradeHub is an online marketplace connecting independent tradespeople with clients seeking residential and commercial trade services. TradeHub acts solely as an intermediary and is not a party to any service contract formed between you and a client. You operate as an independent contractor — not as an employee, agent, or partner of TradeHub.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">3. Identity Verification</h3>
                <p>Before accepting bookings you must complete TradeHub's identity and licence verification process, which may include submission of a government-issued photo ID, proof of trade qualifications, and valid insurance certificates. TradeHub reserves the right to reject or revoke verification at any time if submitted documents are found to be inaccurate, fraudulent, or expired. Verification does not constitute an endorsement of your services by TradeHub.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">4. Account Registration & Security</h3>
                <p>You must provide accurate, current, and complete information during registration and keep your account details — including trade licences, insurance, and qualifications — up to date at all times. You are responsible for all activity that occurs under your account. Notify us immediately at captureconnects@gmail.com if you suspect unauthorised access.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">5. Accepting & Completing Jobs</h3>
                <p>When you accept a client's job request, a binding service agreement is formed between you and the client under the terms presented at the time of acceptance. You agree to:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/80">
                  <li>Attend jobs at the agreed date, time, and location.</li>
                  <li>Carry out all work to a professional standard and in accordance with applicable building codes, regulations, and safety requirements.</li>
                  <li>Communicate any changes, delays, or issues to the client promptly via the TradeHub messaging system.</li>
                  <li>Mark jobs as complete only when all agreed work has been carried out to the client's satisfaction.</li>
                  <li>Not solicit or accept off-platform payments to circumvent TradeHub's fee structure.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">6. Payments & Escrow</h3>
                <p>Client funds for each job are held in TradeHub's secure escrow account and released to you once the client confirms satisfactory completion. In the event of a dispute, payment release may be delayed pending resolution through TradeHub's mediation process. TradeHub charges a platform commission on each transaction; the applicable rate is displayed in your Pro dashboard before you accept a booking.</p>
                <p><span className="font-medium text-foreground">Payout Hold Period.</span> To protect all parties, payments are subject to a <span className="font-medium text-foreground">48–72 hour review period</span> following job completion before funds are transferred to your account. This holding period allows TradeHub to verify the transaction, confirm there are no open disputes or refund requests, and ensure compliance with platform policies. Payouts are processed after this review window closes, subject to your payment provider's processing times. TradeHub is not responsible for additional delays caused by your bank or payment provider.</p>
                <p><span className="font-medium text-foreground">Post-Payout Refund Recovery.</span> If a refund is approved in relation to a booking or order after your payout has already been disbursed, you remain liable for the refunded amount. TradeHub will recover this amount through one or more of the following means: deducting it from your next scheduled payout or future payout balances; issuing a direct repayment request to you; or pursuing recovery through any other lawful means available. You agree to cooperate promptly with any such recovery process. Outstanding refund obligations survive account closure or termination.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">7. Selling Items on the Marketplace</h3>
                <p>Verified Pros may list physical goods and trade materials ("Items") for sale through the TradeHub marketplace. By listing an Item you represent and warrant that:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/80">
                  <li>You have the legal right to sell the Item and it does not infringe any third-party intellectual property rights.</li>
                  <li>All listing information — including description, images, price, and stock levels — is accurate and not misleading.</li>
                  <li>The Item complies with all applicable product safety laws and regulations.</li>
                  <li>You will fulfil confirmed orders promptly and to the standard described in the listing.</li>
                </ul>
                <p><span className="font-medium text-foreground">Orders & Fulfilment.</span> When a buyer places an order, a binding contract of sale is formed between you and the buyer. TradeHub acts solely as the platform facilitating the transaction. You must dispatch the Item within the timeframe specified in your listing and provide tracking information where applicable.</p>
                <p><span className="font-medium text-foreground">Returns & Refunds.</span> You must honour return requests within 14 days of delivery for Items that are unused, in original condition, and in original packaging, unless the Item is custom-made, perishable, or explicitly marked non-returnable. For faulty or misrepresented Items, you are responsible for providing a full refund or replacement at no cost to the buyer. Failure to honour legitimate returns may result in TradeHub issuing a refund from your escrow balance and may affect your seller standing.</p>
                <p><span className="font-medium text-foreground">Marketplace Commission.</span> A commission fee applies to each Item sold through the marketplace; the applicable rate is shown in your seller settings before you publish a listing.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">8. Insurance & Compliance</h3>
                <p>You are solely responsible for maintaining adequate public liability insurance and any other insurance required by law or your trade body throughout your time on the platform. TradeHub does not provide insurance coverage for your work, tools, or materials. You must comply with all applicable laws, licensing requirements, and health and safety regulations relevant to your trade.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">9. Reviews & Ratings</h3>
                <p>Clients may leave reviews after a job is completed. You must not solicit, incentivise, or attempt to manipulate reviews in any way. TradeHub reserves the right to remove reviews that violate its content standards. Your public rating is an average of verified client reviews and directly affects your visibility in search results.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">10. Prohibited Conduct</h3>
                <p>You must not use TradeHub to:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/80">
                  <li>Misrepresent your qualifications, experience, or insurance status.</li>
                  <li>Accept jobs you are not qualified or licenced to perform.</li>
                  <li>Harass, threaten, or discriminate against any client or other user.</li>
                  <li>Contact clients outside the platform to arrange off-platform payments.</li>
                  <li>Attempt to gain unauthorised access to TradeHub systems or data.</li>
                  <li>Engage in any activity that violates applicable law or regulation.</li>
                </ul>
                <p>Violation of these rules may result in immediate account suspension or permanent termination, withholding of pending payments pending investigation, and reporting to relevant regulatory authorities.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">11. Dispute Resolution</h3>
                <p>In the event of a dispute with a client, both parties must first attempt resolution through TradeHub's in-platform mediation tool. TradeHub's decision in mediation is final regarding any escrow funds held at the time of the dispute. If mediation fails, disputes shall be subject to binding arbitration in accordance with the rules of the relevant arbitration body in your jurisdiction, except where prohibited by local law.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">12. Limitation of Liability</h3>
                <p>To the fullest extent permitted by law, TradeHub's aggregate liability to you for any claim arising out of or related to these Terms or the platform shall not exceed the total commissions paid by you to TradeHub in the 12 months preceding the claim. TradeHub is not liable for any indirect, incidental, consequential, or punitive damages, including loss of earnings arising from job cancellations, account suspension, or platform downtime.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">13. Privacy & Data</h3>
                <p>Your personal and business data is processed in accordance with TradeHub's Privacy Policy. By accepting these Terms you consent to the collection, use, and storage of your data as described therein, including sharing your public profile, ratings, and trade details with prospective clients.</p>
                <p><span className="font-medium text-foreground">Data Retention After Account Deletion.</span> When you delete your account, certain information is retained for up to 12 months from the date of deletion. This includes job records, payment history, dispute correspondence, and any data required for legal, regulatory, or fraud-prevention purposes. After the 12-month retention period, this data is permanently deleted, except where a longer period is required by applicable law. During the retention period your data will not be used for marketing and will not be accessible to you via the platform.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">14. Modifications to Terms</h3>
                <p>TradeHub may update these Terms from time to time. Where changes are material we will notify you by email or in-app notification at least 14 days before the new Terms take effect. Continued use of the platform after that date constitutes acceptance of the revised Terms.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">15. Termination</h3>
                <p>You may close your account at any time via your account settings, provided there are no outstanding jobs or disputes. TradeHub may suspend or terminate your account immediately if you breach these Terms, your verification lapses, you engage in fraudulent activity, or if required by law. Outstanding payment obligations and any pending dispute resolutions survive termination.</p>
                <p>Upon account deletion, job records, payment history, and dispute correspondence are retained for up to 12 months for legal, regulatory, and fraud-prevention purposes, as described in Section 13 (Privacy & Data).</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">16. Governing Law</h3>
                <p>These Terms are governed by and construed in accordance with applicable law. Any disputes not resolved by arbitration shall be subject to the exclusive jurisdiction of the courts in the relevant territory.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">17. Contact</h3>
                <p>For questions about these Terms, contact us at <span className="text-primary">captureconnects@gmail.com</span> or through the Help Centre in your Pro dashboard.</p>
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
