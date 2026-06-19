import { supabase } from "@/lib/supabase";
import { fetchStatTotals } from "@/backend/pro-stat-totals";

export type ProStats = {
  earningsThirtyDays: number;
  jobsCompleted: number;
  portfolioCount: number;
  pendingRequests: number;
  totalReviews: number;
  totalLikes: number;
  totalProfileViews: number;
  newOrders: number;
  totalMerchandise: number;
};

export async function fetchProStats(): Promise<ProStats> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return {
      earningsThirtyDays: 0,
      jobsCompleted: 0,
      portfolioCount: 0,
      pendingRequests: 0,
      totalReviews: 0,
      totalLikes: 0,
      totalProfileViews: 0,
      newOrders: 0,
      totalMerchandise: 0,
    };
  }

  const uid = authData.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const [
    { data: allCompleted },
    { data: recentCompleted },
    { data: pending },
    { count: portfolioCount },
    { count: reviewCount },
    likesRes,
    statTotals,
    { count: newOrdersCount },
    { count: merchandiseCount },
  ] = await Promise.all([
    supabase
      .from("client_bookings")
      .select("id")
      .eq("tradesperson_id", uid)
      .eq("booking_status", "completed"),
    supabase
      .from("client_bookings")
      .select("total_price")
      .eq("tradesperson_id", uid)
      .eq("booking_status", "completed")
      .gte("created_at", thirtyDaysAgoIso),
    supabase
      .from("client_bookings")
      .select("id")
      .eq("tradesperson_id", uid)
      .eq("booking_status", "pending"),
    supabase
      .from("tradesperson_portfolios")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("client_reviews")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", uid),
    supabase
      .from("client_likes")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", uid),
    fetchStatTotals(),
    supabase
      .from("client_shopping")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", uid)
      .or("isDelivered.is.null,isDelivered.eq.false"),
    supabase
      .from("tradesperson_SellersSpecialty")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", uid),
  ]);

  const earningsThirtyDays = (recentCompleted ?? []).reduce(
    (sum, b) => sum + Number(b.total_price ?? 0),
    0,
  );

  return {
    earningsThirtyDays,
    jobsCompleted: (allCompleted ?? []).length,
    portfolioCount: portfolioCount ?? 0,
    pendingRequests: (pending ?? []).length,
    totalReviews: reviewCount ?? 0,
    totalLikes: likesRes.count ?? 0,
    totalProfileViews: statTotals.totalProfileViews,
    newOrders: newOrdersCount ?? 0,
    totalMerchandise: merchandiseCount ?? 0,
  };
}
