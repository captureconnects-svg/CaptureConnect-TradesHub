import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import { CurrencySelect, useCurrency } from "@/lib/currency";
import { FooterSection } from "@/components/trade/FooterSection";
import { PublicMobileNav } from "@/components/trade/PublicMobileNav";
import { TrendingUp, Users, Briefcase, ShieldCheck, ArrowRight, Star, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/landing-client.png";
import logoImg from "@/assets/logo-withoutBranding.png";
import entrepreneurImg from "@/assets/pro-landing.png";
import clientImg from "@/assets/client-landing.png";
import { useLandingStats } from "@/hooks/queries/useLandingStats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capture Connect - TradeHub Marketplace — Where Every Trade Builds a Business" },
      {
        name: "description",
        content:
          "The all-trades marketplace built for entrepreneurs. Connect skilled tradespeople with clients and grow your trade into a thriving business.",
      },
      { property: "og:title", content: "Capture Connect - TradeHub Marketplace — Where Every Trade Builds a Business" },
      {
        property: "og:description",
        content:
          "All trades. One platform. Built for entrepreneurs ready to scale their craft.",
      },
    ],
  }),
  component: Index,
});

const STAT_ICONS = [Users, TrendingUp, Briefcase, Star];
const STAT_LABELS = ["Verified Tradespeople", "Trade Revenue Generated", "Jobs Completed", "Average Rating"];

function Index() {
  const { data: pageStats } = useLandingStats();
  const { format } = useCurrency();

  const statValues = [
    pageStats?.verifiedPros ?? "—",
    pageStats ? format(pageStats.tradeRevenueUSD, { compact: true, decimals: 1 }) : "—",
    pageStats?.jobsCompleted ?? "—",
    pageStats?.avgRating ?? "—",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-1">
            <img
              src={logoImg}
              alt="Capture Connect – TradeHub Marketplace"
              className="h-16 w-auto object-contain"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-foreground">Capture Connect</span>
              <span className="text-xs font-medium text-amber-500 tracking-wide">TradeHub Marketplace</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#clients" className="hover:text-foreground transition-colors">For Clients</a>
            <a href="#pros" className="hover:text-foreground transition-colors">For Pros</a>
            <Link to="/reviews" className="hover:text-foreground transition-colors">Reviews</Link>
          </nav>
          <div className="flex items-center gap-2">
            <CurrencySelect />
            <ThemeToggle />
            <PublicMobileNav>
              <a href="#clients" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">For Clients</a>
              <a href="#pros" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">For Pros</a>
              <Link to="/reviews" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Reviews</Link>
              <Link to="/help" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Help Centre</Link>
              <Link to="/contact" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Contact</Link>
            </PublicMobileNav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Skilled tradespeople working on a construction site"
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col items-start justify-center px-6 py-32">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" /> All-Trades Marketplace
          </span>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-sm md:text-7xl">
            Every trade.{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Every entrepreneur.
            </span>{" "}
            <br className="hidden md:block" />
            One platform.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/75 md:text-xl">
            From electricians to welders, carpenters to solar installers — TradeHub connects
            skilled pros with paying clients and gives them the tools to scale their trade
            into a real business.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-lg" asChild>
              <Link to="/client-login-signup">Hire a Pro <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" className="border-2 border-white/60 text-white bg-transparent hover:bg-white/10 font-semibold backdrop-blur" asChild>
              <Link to="/pro-login-signup" search={{ mode: "signup" }}>Join as a Tradesperson</Link>
            </Button>
          </div>

        </div>
      </section>

      {/* STATS */}
      <section className="border-t border-border bg-[var(--surface-elevated)] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
            {STAT_LABELS.map((label, i) => {
              const Icon = STAT_ICONS[i];
              return (
                <div key={label} className="bg-card p-8">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <div className="text-3xl font-bold tracking-tight">{statValues[i]}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOR CLIENTS */}
      <section id="clients" className="border-t border-border bg-[var(--surface-elevated)] py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={clientImg}
              alt="Client reviewing project plans with contractor"
              width={1280}
              height={1280}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              For Clients
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              Post a job. Get real quotes. Hire with confidence.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Skip the endless calls and ghost contractors. Describe your project and let
              verified tradespeople come to you with transparent pricing and real reviews.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Verified licenses, insurance & background checks",
                "Compare quotes side-by-side in minutes",
                "Secure escrow — pay only when the job's done right",
                "Built-in messaging, scheduling & invoicing",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-10 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-md" asChild>
              <Link to="/client-login-signup">Post a job free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FOR PROS / ENTREPRENEUR */}
      <section id="pros" className="border-t border-border py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div className="md:order-2 relative overflow-hidden rounded-2xl border border-border">
            <img
              src={entrepreneurImg}
              alt="Tradesperson entrepreneur running their business"
              width={1280}
              height={1280}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="md:order-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              For Entrepreneur/Tradespeople
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              Stop trading hours. Start building an empire.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              TradeHub is more than leads — it's the business OS for ambitious trade
              entrepreneurs. Pipeline, payments, marketing, and team management in one place.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                { t: "Steady job pipeline", d: "Match with high-intent clients in your area daily." },
                { t: "Instant payouts", d: "Get paid same-day with built-in invoicing." },
                { t: "Grow your brand", d: "A portfolio page that wins jobs while you sleep." },
                { t: "Scale your crew", d: "Add team members, assign jobs, track margins." },
              ].map((b) => (
                <div key={b.t} className="rounded-xl border border-border bg-card p-5">
                  <div className="font-semibold">{b.t}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-10 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-md" asChild>
              <Link to="/pro-login-signup" search={{ mode: "signup" }}>Start earning today <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Your trade is a business.{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              We'll help you run it.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Join thousands of entrepreneurs already scaling on TradeHub. Free to start. No
            contracts. Cancel anytime.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-lg" asChild>
              <Link to="/client-login-signup">Hire a Pro today</Link>
            </Button>
            <Button size="lg" className="border-2 border-foreground text-foreground bg-transparent hover:bg-foreground hover:text-background font-semibold transition-colors" asChild>
              <Link to="/pro-login-signup" search={{ mode: "signup" }}>Join as a Tradesperson</Link>
            </Button>
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
}
