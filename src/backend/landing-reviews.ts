import { supabase } from "@/lib/supabase";

export type LandingReview = {
  id: number;
  name: string;
  userType: string;
  rating: number;
  review: string;
  createdAt: string;
};

export async function submitLandingReview(params: {
  name: string;
  userType: string;
  rating: number;
  review: string;
}): Promise<void> {
  const { error } = await supabase.from("landing_reviews").insert({
    name: params.name,
    userType: params.userType,
    rating: params.rating,
    review: params.review,
  });
  if (error) throw new Error(error.message);
}

export async function fetchTopClientReviews(): Promise<LandingReview[]> {
  const { data, error } = await supabase
    .from("client_reviews")
    .select("id, client_id, review_rating, review_title, review_descript, created_at")
    .gte("review_rating", 4)
    .order("review_rating", { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const clientIds = [...new Set(data.map((r) => r.client_id as string))];
  const { data: profiles } = await supabase
    .from("client_profiles")
    .select("id, full_name, username")
    .in("id", clientIds);

  const nameById: Record<string, string> = {};
  for (const cp of profiles ?? []) {
    nameById[cp.id as string] =
      (cp.username as string | null)?.trim() ||
      (cp.full_name as string | null)?.trim() ||
      "Client";
  }

  const mapped: LandingReview[] = data.map((r) => ({
    id:        r.id            as number,
    name:      nameById[r.client_id as string] ?? "Client",
    userType:  "Client",
    rating:    r.review_rating as number,
    review:    r.review_descript as string,
    createdAt: r.created_at    as string,
  }));

  // Fisher-Yates shuffle then take 15
  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }
  return mapped.slice(0, 15);
}

export async function fetchLandingReviews(): Promise<LandingReview[]> {
  const { data, error } = await supabase
    .from("landing_reviews")
    .select("id, name, userType, rating, review, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return data.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    userType: r.userType as string,
    rating: r.rating as number,
    review: r.review as string,
    createdAt: r.created_at as string,
  }));
}

export type PageStats = {
  avgRating: string;
  jobsCompleted: string;
  satisfactionRate: string;
  verifiedPros: string;
};

export async function fetchPageStats(): Promise<PageStats> {
  const [
    { data: clientRatings },
    { count: completedBookings },
    { count: deliveredOrders },
    { count: proCount },
  ] = await Promise.all([
    supabase.from("client_reviews").select("review_rating"),
    supabase
      .from("client_bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_status", "completed"),
    supabase
      .from("client_shopping")
      .select("id", { count: "exact", head: true })
      .eq("isDelivered", true),
    supabase
      .from("tradesperson_profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  // Average rating from client_reviews
  const clientRatingValues = (clientRatings ?? []).map((r) => r.review_rating as number);
  const avgRatingNum =
    clientRatingValues.length > 0
      ? clientRatingValues.reduce((s, v) => s + v, 0) / clientRatingValues.length
      : 0;
  const avgRating = clientRatingValues.length > 0
    ? `${(Math.round(avgRatingNum * 10) / 10).toFixed(1)}/5`
    : "—";

  // Jobs completed: completed bookings + delivered orders
  const totalJobs = (completedBookings ?? 0) + (deliveredOrders ?? 0);
  const jobsCompleted =
    totalJobs >= 1000
      ? `${(totalJobs / 1000).toFixed(1)}K+`
      : totalJobs > 0
        ? `${totalJobs}`
        : "0";

  // Satisfaction rate: % of client_reviews rated 4 or 5 stars
  const satisfactionRate =
    clientRatingValues.length > 0
      ? `${Math.round((clientRatingValues.filter((r) => r >= 4).length / clientRatingValues.length) * 100)}%`
      : "—";

  // Verified pros: total tradesperson_profiles
  const totalPros = proCount ?? 0;
  const verifiedPros =
    totalPros >= 1000
      ? `${(totalPros / 1000).toFixed(1)}K+`
      : `${totalPros}`;

  return { avgRating, jobsCompleted, satisfactionRate, verifiedPros };
}
