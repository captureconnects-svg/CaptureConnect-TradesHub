import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FooterSection } from "@/components/trade/FooterSection";
import { Star, ArrowLeft, CheckCircle2, Video } from "lucide-react";
import logoImg from "@/assets/logo-withoutBranding.png";
import { ThemeToggle } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { PublicMobileNav } from "@/components/trade/PublicMobileNav";
import { fetchTopClientReviews, fetchPageStats, type LandingReview, type PageStats } from "@/backend/landing-reviews";
import { fetchApprovedTestimonials, type VideoTestimonialRecord } from "@/backend/testimonials";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Capture Connect" },
      {
        name: "description",
        content: "See what clients and tradespeople say about TradeHub.",
      },
    ],
  }),
  component: ReviewsPage,
});

const GRADIENTS = [
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
];

const STAT_LABELS = [
  { key: "avgRating" as const, label: "Average rating across all trades" },
  { key: "jobsCompleted" as const, label: "Jobs completed on platform" },
  { key: "satisfactionRate" as const, label: "Client satisfaction rate" },
  { key: "verifiedPros" as const, label: "Verified pro members" },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const [reviewList, setReviewList] = useState<LandingReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [stats, setStats] = useState<PageStats | null>(null);
  const [videoList, setVideoList] = useState<VideoTestimonialRecord[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  useEffect(() => {
    fetchTopClientReviews()
      .then(setReviewList)
      .finally(() => setReviewsLoading(false));
    fetchPageStats().then(setStats).catch(() => {});
    fetchApprovedTestimonials()
      .then(setVideoList)
      .catch(() => {})
      .finally(() => setVideosLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-1">
            <img
              src={logoImg}
              alt="Capture Connect – TradeHub Marketplace"
              className="h-16 w-auto object-contain"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-foreground">Capture Connect</span>
              <span className="text-xs font-medium text-amber-500 tracking-wide">TradeHub Marketplace</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/reviews" className="text-foreground font-medium">Reviews</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PublicMobileNav>
              <Link to="/" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Home</Link>
              <Link to="/reviews" className="rounded-lg px-3 py-3 bg-muted font-medium">Reviews</Link>
              <Link to="/help" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Help Centre</Link>
              <Link to="/contact" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Contact</Link>
            </PublicMobileNav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-border bg-[var(--surface-elevated)] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-8 w-8 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              thousands
            </span>{" "}
            of tradespeople and clients.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Real reviews from verified clients and pro members on the TradeHub platform.
          </p>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            {STAT_LABELS.map((s) => (
              <div key={s.label} className="bg-background px-8 py-10">
                <div className="text-3xl font-extrabold tracking-tight text-amber-500">
                  {stats ? stats[s.key] : "—"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS GRID */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          {reviewsLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading reviews…</div>
          ) : reviewList.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No reviews yet.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviewList.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm"
                >
                  <StarRow count={r.rating} />
                  <p className="flex-1 text-base leading-relaxed">"{r.review}"</p>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <div className="font-semibold text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.userType}</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* VIDEO TESTIMONIALS */}
      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-2">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Video Testimonials
            </h2>
            <p className="mt-1 text-muted-foreground">
              Hear directly from our community.
            </p>
          </div>

          {videosLoading ? (
            <div className="mt-12 text-center text-muted-foreground py-8">Loading testimonials…</div>
          ) : videoList.length === 0 ? (
            <div className="mt-12 text-center text-muted-foreground py-8">No video testimonials yet.</div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videoList.map((v, i) => (
                <div key={v.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  {v.videoUrl ? (
                    <div className="aspect-video w-full bg-black">
                      <video
                        src={v.videoUrl}
                        controls
                        className="h-full w-full"
                        title={`${v.name} testimonial`}
                      />
                    </div>
                  ) : (
                    <div className={`aspect-video w-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex flex-col items-center justify-center gap-3 relative`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40 text-xl font-bold text-white">
                        {v.name.charAt(0)}
                      </div>
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                        <Video className="h-5 w-5 text-gray-900" />
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">"{v.description}"</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{v.name}</div>
                        <div className="text-xs text-muted-foreground">{v.userType}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Ready to join them?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start for free — no contracts, no hidden fees.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-lg" asChild>
              <Link to="/client-login-signup">Hire a Pro</Link>
            </Button>
            <Button size="lg" className="border-2 border-foreground text-foreground bg-transparent hover:bg-foreground hover:text-background font-semibold transition-colors" asChild>
              <Link to="/pro-login-signup" search={{ mode: "signup" }}>Join as a Tradesperson</Link>
            </Button>
          </div>
          <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
