import { supabase } from "@/lib/supabase";
import { logActivity } from "@/backend/pro-activity";

export type ClientReview = {
  id: number;
  clientId: string;
  tradespersonId: string;
  createdAt: string;
  rating: number;
  title: string;
  description: string;
  clientName: string;
};

export type TraderRatingStats = {
  avgRating: number;
  totalReviews: number;
};

export async function submitClientReview(params: {
  tradespersonId: string;
  bookingId?: string;
  rating: number;
  title: string;
  description: string;
}): Promise<number> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase.from("client_reviews").insert({
    client_id: authData.user.id,
    tradesperson_id: params.tradespersonId,
    review_rating: params.rating,
    review_title: params.title,
    review_descript: params.description,
    ...(params.bookingId ? { booking_id: params.bookingId } : {}),
  }).select("id").single();

  if (error || !data) throw error ?? new Error("Review insert returned no data");

  (async () => {
    const { data: cp } = await supabase
      .from("client_profiles")
      .select("full_name, username")
      .eq("id", authData.user!.id)
      .single();
    const name =
      (cp?.username as string | null)?.trim() ||
      (cp?.full_name as string | null)?.trim() ||
      "A client";
    await logActivity({
      tradespersonId: params.tradespersonId,
      activityType: "review",
      description: `${name} left a ${params.rating}-star review`,
      clientId: authData.user!.id,
    });
  })().catch(() => {});

  return data.id as number;
}

export async function fetchTraderReviews(tradespersonId: string): Promise<ClientReview[]> {
  const { data } = await supabase
    .from("client_reviews")
    .select("id, client_id, created_at, review_rating, review_title, review_descript")
    .eq("tradesperson_id", tradespersonId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const clientIds = [...new Set(data.map((r) => r.client_id as string))];
  const { data: clientProfiles } = await supabase
    .from("client_profiles")
    .select("id, full_name, username")
    .in("id", clientIds);

  const nameById: Record<string, string> = {};
  for (const cp of clientProfiles ?? []) {
    nameById[cp.id as string] =
      (cp.username as string | null)?.trim() ||
      (cp.full_name as string | null)?.trim() ||
      "Client";
  }

  return data.map((r) => ({
    id: r.id as number,
    clientId: r.client_id as string,
    tradespersonId,
    createdAt: r.created_at as string,
    rating: r.review_rating as number,
    title: r.review_title as string,
    description: r.review_descript as string,
    clientName: nameById[r.client_id as string] ?? "Client",
  }));
}

export async function fetchTraderRatingStats(tradespersonId: string): Promise<TraderRatingStats> {
  const { data } = await supabase
    .from("client_reviews")
    .select("review_rating")
    .eq("tradesperson_id", tradespersonId);

  if (!data || data.length === 0) return { avgRating: 0, totalReviews: 0 };

  const ratings = data.map((r) => r.review_rating as number);
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return {
    avgRating: Math.round(avg * 10) / 10,
    totalReviews: ratings.length,
  };
}

export async function fetchMyReviews(limit = 5): Promise<ClientReview[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const uid = authData.user.id;
  const { data } = await supabase
    .from("client_reviews")
    .select("id, client_id, created_at, review_rating, review_title, review_descript")
    .eq("tradesperson_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  const clientIds = [...new Set(data.map((r) => r.client_id as string))];
  const { data: clientProfiles } = await supabase
    .from("client_profiles")
    .select("id, full_name, username")
    .in("id", clientIds);

  const nameById: Record<string, string> = {};
  for (const cp of clientProfiles ?? []) {
    nameById[cp.id as string] =
      (cp.username as string | null)?.trim() ||
      (cp.full_name as string | null)?.trim() ||
      "Client";
  }

  return data.map((r) => ({
    id: r.id as number,
    clientId: r.client_id as string,
    tradespersonId: uid,
    createdAt: r.created_at as string,
    rating: r.review_rating as number,
    title: r.review_title as string,
    description: r.review_descript as string,
    clientName: nameById[r.client_id as string] ?? "Client",
  }));
}

export async function deleteClientReview(reviewId: number): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  await supabase
    .from("client_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("client_id", authData.user.id);
}

export async function fetchRatingStatsForTraders(
  traderIds: string[],
): Promise<Record<string, TraderRatingStats>> {
  if (traderIds.length === 0) return {};

  const { data } = await supabase
    .from("client_reviews")
    .select("tradesperson_id, review_rating")
    .in("tradesperson_id", traderIds);

  const ratingsByTrader: Record<string, number[]> = {};
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const tid = row.tradesperson_id as string;
    if (!ratingsByTrader[tid]) ratingsByTrader[tid] = [];
    ratingsByTrader[tid].push(row.review_rating as number);
  }

  const result: Record<string, TraderRatingStats> = {};
  for (const tid of traderIds) {
    const ratings = ratingsByTrader[tid] ?? [];
    if (ratings.length === 0) {
      result[tid] = { avgRating: 0, totalReviews: 0 };
    } else {
      const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      result[tid] = {
        avgRating: Math.round(avg * 10) / 10,
        totalReviews: ratings.length,
      };
    }
  }
  return result;
}

export async function fetchClientBookingReviews(
  bookingIds: string[],
): Promise<Record<string, number>> {
  if (bookingIds.length === 0) return {};
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return {};

  const { data } = await supabase
    .from("client_reviews")
    .select("id, booking_id")
    .eq("client_id", authData.user.id)
    .in("booking_id", bookingIds);

  const result: Record<string, number> = {};
  for (const r of data ?? []) {
    if (r.booking_id) result[r.booking_id as string] = r.id as number;
  }
  return result;
}
