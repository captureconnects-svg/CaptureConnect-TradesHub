import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { TradeCard } from "@/components/trade/TradeCard";
import { SavedSheet } from "@/components/trade/SavedSheet";
import { CATEGORIES, slugifyName, type Tradesperson } from "@/lib/trades-data";
import { supabase } from "@/lib/supabase";
import { fetchStartingPricesForTraders } from "@/backend/client-trader-profile";
import { fetchClientLikes, toggleClientLike } from "@/backend/client-likes";
import { fetchRatingStatsForTraders } from "@/backend/client-reviews";

export const Route = createFileRoute("/client-dashboard/category/$slug")({
  loader: ({ params }) => {
    const category = CATEGORIES.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category.name ?? "Category"} — TradeHub` },
      {
        name: "description",
        content: `Browse verified ${loaderData?.category.name.toLowerCase() ?? "tradespeople"} on TradeHub.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Category not found</h1>
      <Button asChild><Link to="/client-dashboard">Back to dashboard</Link></Button>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("rating");
  const [liked, setLiked] = useState<string[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [showLikes, setShowLikes] = useState(false);
  const [allPros, setAllPros] = useState<Tradesperson[]>([]);
  const [loading, setLoading] = useState(true);

  const toggleLike = (id: string) => {
    if (!clientId) return;
    const isLiked = liked.includes(id);
    setLiked((prev) => (isLiked ? prev.filter((x) => x !== id) : [...prev, id]));
    toggleClientLike(clientId, id, isLiked);
  };

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const uid = authData.user.id;
        setClientId(uid);
        fetchClientLikes(uid).then(setLiked);
      }
      // First: find all pros whose specialty includes this category
      const { data: categorySpecialties } = await supabase
        .from("tradesperson_specialty")
        .select("tradesperson_id")
        .eq("specialty", category.name);

      const matchedIds = new Set(
        (categorySpecialties ?? []).map((r) => r.tradesperson_id as string),
      );

      if (matchedIds.size === 0) {
        setAllPros([]);
        setLoading(false);
        return;
      }

      // Then: fetch profiles + ALL specialties for those pros in parallel
      const ids = [...matchedIds];
      const [{ data: profiles }, { data: allSpecialties }] = await Promise.all([
        supabase
          .from("tradesperson_profiles")
          .select("id, full_name, username, location, about, profile_image")
          .in("id", ids)
          .eq("active_role", true),
        supabase
          .from("tradesperson_specialty")
          .select("tradesperson_id, specialty")
          .in("tradesperson_id", ids),
      ]);

      // Build map: proId -> [specialty, ...]
      const specialtiesByPro: Record<string, string[]> = {};
      for (const row of allSpecialties ?? []) {
        const pid = row.tradesperson_id as string;
        if (!specialtiesByPro[pid]) specialtiesByPro[pid] = [];
        if (!specialtiesByPro[pid].includes(row.specialty as string)) {
          specialtiesByPro[pid].push(row.specialty as string);
        }
      }

      const traderIds = (profiles ?? []).map((p) => p.id as string);

      const [startingPrices, ratingStats] = await Promise.all([
        fetchStartingPricesForTraders(specialtiesByPro),
        fetchRatingStatsForTraders(traderIds),
      ]);

      const mapped: Tradesperson[] = (profiles ?? []).map((p) => {
        const id = p.id as string;
        const nameParts = String(p.username ?? p.full_name ?? "").split(" ").filter(Boolean);
        const initials =
          nameParts.slice(0, 2).map((w: string) => w[0].toUpperCase()).join("") || "?";
        return {
          id,
          urlSlug: slugifyName(String(p.username ?? p.full_name ?? "")),
          name: String(p.username ?? p.full_name ?? "Unknown"),
          trade: category.name,
          categorySlug: category.slug,
          location: String(p.location ?? ""),
          rating: ratingStats[id]?.avgRating ?? 0,
          reviews: ratingStats[id]?.totalReviews ?? 0,
          hourly: 0,
          verified: false,
          initials,
          tagline: String(p.about ?? ""),
          specialties: specialtiesByPro[id] ?? [category.name],
          startingPrice: startingPrices[id] ?? 0,
          profileImage: String(p.profile_image ?? ""),
        } satisfies Tradesperson;
      });

      setAllPros(mapped);
      setLoading(false);
    }

    load();
  }, [category.name, category.slug]);

  const pros = useMemo(() => {
    let list = [...allPros];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q),
      );
    }
    if (location) {
      list = list.filter((p) => p.location.toLowerCase().includes(location.toLowerCase()));
    }
    list.sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating || b.reviews - a.reviews;
      if (sort === "reviews") return b.reviews - a.reviews;
      if (sort === "price-low") return a.hourly - b.hourly;
      if (sort === "price-high") return b.hourly - a.hourly;
      return 0;
    });
    return list;
  }, [allPros, query, location, sort]);

  const Icon = category.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={liked.length} onOpenLikes={() => setShowLikes(true)} />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <Link
          to="/client-dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All trades
        </Link>

        {/* Header */}
        <section className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${category.gradient} p-8 md:p-12`}>
          <div className="absolute inset-0 bg-background/40" />
          <div className="relative flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-background/70 backdrop-blur flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{category.name}</h1>
              <p className="text-muted-foreground mt-1">
                {loading ? "…" : allPros.length.toLocaleString()} verified pros available now
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${category.name.toLowerCase()}…`}
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location"
                className="pl-9"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="reviews">Most reviewed</SelectItem>
                <SelectItem value="price-low">Price: low to high</SelectItem>
                <SelectItem value="price-high">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Results */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            {loading ? "Loading…" : `${pros.length} ${pros.length === 1 ? "pro" : "pros"} available`}
          </h2>
          {loading ? (
            <p className="text-muted-foreground py-10 text-center">Loading tradespeople…</p>
          ) : pros.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">No matches. Try clearing filters.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pros.map((p) => (
                <TradeCard key={p.id} pro={p} liked={liked.includes(p.id)} onToggleLike={toggleLike} fromSlug={category.slug} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SavedSheet open={showLikes} onOpenChange={setShowLikes} />
    </div>
  );
}
