import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, ArrowRight, Sparkles, Heart, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { TradeCard } from "@/components/trade/TradeCard";
import { CATEGORIES, slugifyName, type Tradesperson } from "@/lib/trades-data";
import { supabase } from "@/lib/supabase";
import { fetchStartingPricesForTraders } from "@/backend/client-trader-profile";
import { fetchClientLikes, toggleClientLike } from "@/backend/client-likes";
import { fetchRatingStatsForTraders } from "@/backend/client-reviews";
import heroImg from "@/assets/dashboard-hero.jpg";

export const Route = createFileRoute("/client-dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TradeHub" },
      { name: "description", content: "Find vetted tradespeople, manage jobs, and track your bookings on TradeHub." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [location, setLocation] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [showLikes, setShowLikes] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  const [pros, setPros] = useState<Tradesperson[]>([]);
  const [profileCategories, setProfileCategories] = useState<Record<string, string[]>>({});
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");

  const toggleLike = (id: string) => {
    if (!clientId) return;
    const isLiked = liked.includes(id);
    setLiked((prev) => (isLiked ? prev.filter((x) => x !== id) : [...prev, id]));
    toggleClientLike(clientId, id, isLiked);
  };

  useEffect(() => {
    async function loadName() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const uid = authData.user.id;
      setClientId(uid);
      const [{ data }, existingLikes] = await Promise.all([
        supabase
          .from("client_profiles")
          .select("username, full_name, email")
          .eq("id", uid)
          .single(),
        fetchClientLikes(uid),
      ]);
      const name =
        (data?.username as string | undefined)?.trim() ||
        (data?.full_name as string | undefined)?.trim() ||
        (data?.email as string | undefined)?.trim() ||
        authData.user.email?.trim() ||
        "";
      setClientName(name);
      setLiked(existingLikes);
    }
    loadName();
  }, []);

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: specialties }] = await Promise.all([
        supabase
          .from("tradesperson_profiles")
          .select("id, full_name, username, location, about, profile_image")
          .eq("active_role", true),
        supabase
          .from("tradesperson_specialty")
          .select("tradesperson_id, specialty"),
      ]);

      const sp = specialties ?? [];
      const pr = profiles ?? [];

      // Build: profileId -> [categorySlug, ...] and profileId -> [specialtyName, ...]
      const slugsByProfile: Record<string, string[]> = {};
      const specialtyNamesByProfile: Record<string, string[]> = {};
      const countBySlug: Record<string, Set<string>> = {};

      for (const row of sp) {
        const cat = CATEGORIES.find((c) => c.name === row.specialty);
        if (!cat) continue;
        if (!slugsByProfile[row.tradesperson_id]) slugsByProfile[row.tradesperson_id] = [];
        if (!slugsByProfile[row.tradesperson_id].includes(cat.slug)) {
          slugsByProfile[row.tradesperson_id].push(cat.slug);
        }
        if (!specialtyNamesByProfile[row.tradesperson_id]) specialtyNamesByProfile[row.tradesperson_id] = [];
        if (!specialtyNamesByProfile[row.tradesperson_id].includes(row.specialty as string)) {
          specialtyNamesByProfile[row.tradesperson_id].push(row.specialty as string);
        }
        if (!countBySlug[cat.slug]) countBySlug[cat.slug] = new Set();
        countBySlug[cat.slug].add(row.tradesperson_id);
      }

      const counts: Record<string, number> = {};
      for (const [slug, ids] of Object.entries(countBySlug)) {
        counts[slug] = ids.size;
      }

      const filteredIds = pr
        .filter((p) => (slugsByProfile[p.id as string] ?? []).length > 0)
        .map((p) => p.id as string);

      const [startingPrices, ratingStats] = await Promise.all([
        fetchStartingPricesForTraders(specialtyNamesByProfile),
        fetchRatingStatsForTraders(filteredIds),
      ]);

      const mapped: Tradesperson[] = pr
        .filter((p) => (slugsByProfile[p.id as string] ?? []).length > 0)
        .map((p) => {
          const id = p.id as string;
          const primarySlug = slugsByProfile[id][0];
          const cat = CATEGORIES.find((c) => c.slug === primarySlug);
          const nameParts = String(p.username ?? p.full_name ?? "")
            .split(" ")
            .filter(Boolean);
          const initials =
            nameParts
              .slice(0, 2)
              .map((w: string) => w[0].toUpperCase())
              .join("") || "?";
          const allSlugs = slugsByProfile[id];
          const specialties = allSlugs
            .map((slug) => CATEGORIES.find((c) => c.slug === slug)?.name)
            .filter((n): n is string => n !== undefined);
          return {
            id,
            urlSlug: slugifyName(String(p.username ?? p.full_name ?? "")),
            name: String(p.username ?? p.full_name ?? "Unknown"),
            trade: cat?.name ?? "Tradesperson",
            categorySlug: primarySlug,
            location: String(p.location ?? ""),
            rating: ratingStats[id]?.avgRating ?? 0,
            reviews: ratingStats[id]?.totalReviews ?? 0,
            hourly: 0,
            verified: false,
            initials,
            tagline: String(p.about ?? ""),
            specialties,
            startingPrice: startingPrices[id] ?? 0,
            profileImage: String(p.profile_image ?? ""),
          } satisfies Tradesperson;
        });

      setPros(mapped);
      setProfileCategories(slugsByProfile);
      setCategoryCounts(counts);
      setLoading(false);
    }

    load();
  }, []);

  const results = useMemo(() => {
    return pros
      .filter((p) => {
        if (category !== "all") {
          const allSlugs = profileCategories[p.id] ?? [p.categorySlug];
          if (!allSlugs.includes(category)) return false;
        }
        if (location && !p.location.toLowerCase().includes(location.toLowerCase())) return false;
        if (query) {
          const q = query.toLowerCase();
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.trade.toLowerCase().includes(q) &&
            !p.tagline.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .slice(0, 9);
  }, [pros, profileCategories, query, category, location]);

  // Shuffle once on mount so the order is different every visit
  const shuffledCategories = useMemo(
    () => [...CATEGORIES].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const hasFilters = query !== "" || category !== "all" || location !== "";
  const likedPros = pros.filter((p) => liked.includes(p.id));

  const scrollToCategories = () => {
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={liked.length} onOpenLikes={() => setShowLikes(true)} />

      <main className="container mx-auto px-4 py-6 space-y-12">
        {/* Search bar */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_200px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, trade, or keyword…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location"
                className="pl-9"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Button size="lg" className="md:px-8">Search</Button>
          </div>
        </section>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border">
          <img
            src={heroImg}
            alt="Skilled tradespeople team"
            width={1920}
            height={768}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
          <div className="relative z-10 p-8 md:p-14 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              {clientName ? `Welcome back, ${clientName}` : "Welcome back"}
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
              Find the right trade for the job — today.
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              Browse vetted electricians, plumbers, builders and more. Compare ratings,
              book secure, and pay through escrow.
            </p>
            <Button size="lg" className="mt-6" onClick={scrollToCategories}>
              Browse Trades <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="space-y-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Browse by trade</h2>
            <p className="text-muted-foreground mt-1">Tap any category to see available pros.</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            {shuffledCategories.map((c) => (
              <Link
                key={c.slug}
                to="/client-dashboard/category/$slug"
                params={{ slug: c.slug }}
                className="group relative flex-shrink-0 w-48 aspect-square rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/60 transition-all hover:-translate-y-0.5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
                <div className="relative h-full flex flex-col items-center justify-center p-3 text-center">
                  <div className="h-12 w-12 rounded-xl bg-background/60 backdrop-blur flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <c.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading ? "…" : (categoryCounts[c.slug] ?? 0).toLocaleString()} pros
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Search results (only when filters applied) */}
        {hasFilters && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Results <span className="text-muted-foreground font-normal text-base">({results.length})</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setLocation("");
                }}
              >
                <X className="h-4 w-4 mr-1" /> Clear filters
              </Button>
            </div>
            {results.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center">No tradespeople match your filters.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((p) => (
                  <TradeCard key={p.id} pro={p} liked={liked.includes(p.id)} onToggleLike={toggleLike} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Top-rated tradespeople */}
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Top-rated tradespeople</h2>
              <p className="text-muted-foreground mt-1">Highly reviewed pros with verified ratings.</p>
            </div>
          </div>
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Loading tradespeople…</div>
          ) : pros.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No tradespeople are registered yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pros.slice(0, 8).map((p) => (
                <TradeCard key={p.id} pro={p} liked={liked.includes(p.id)} onToggleLike={toggleLike} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Saved drawer */}
      <Sheet open={showLikes} onOpenChange={setShowLikes}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" /> Saved tradespeople
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {likedPros.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                No saved pros yet. Tap the heart on any card to save them here.
              </p>
            ) : (
              likedPros.map((p) => (
                <TradeCard key={p.id} pro={p} liked onToggleLike={toggleLike} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
