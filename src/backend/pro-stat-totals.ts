import { supabase } from "@/lib/supabase";

export type StatTotals = {
  totalProfileViews: number;
  totalLikes: number;
};

export async function fetchStatTotals(): Promise<StatTotals> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { totalProfileViews: 0, totalLikes: 0 };

  const uid = authData.user.id;
  const now = new Date().toISOString();

  // Roll up expired profile_view records before they would be deleted
  const { data: expiredViews } = await supabase
    .from("client_activity")
    .select("id")
    .eq("tradesperson_id", uid)
    .eq("activity_type", "profile_view")
    .lte("expired_at", now);

  const expiredIds = (expiredViews ?? []).map((r) => r.id as number);

  if (expiredIds.length > 0) {
    const { data: current } = await supabase
      .from("tradesperson_stat_totals")
      .select("total_profile_views")
      .eq("tradesperson_id", uid)
      .single();

    const newTotal = ((current?.total_profile_views as number) ?? 0) + expiredIds.length;

    await supabase
      .from("tradesperson_stat_totals")
      .upsert(
        { tradesperson_id: uid, total_profile_views: newTotal },
        { onConflict: "tradesperson_id" },
      );

    await supabase.from("client_activity").delete().in("id", expiredIds);
  }

  // Fetch persistent total + count of still-active views
  const [{ data: totals }, { count: activeViews }] = await Promise.all([
    supabase
      .from("tradesperson_stat_totals")
      .select("total_profile_views, total_likes")
      .eq("tradesperson_id", uid)
      .single(),
    supabase
      .from("client_activity")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", uid)
      .eq("activity_type", "profile_view")
      .gt("expired_at", now),
  ]);

  return {
    totalProfileViews: ((totals?.total_profile_views as number) ?? 0) + (activeViews ?? 0),
    totalLikes: (totals?.total_likes as number) ?? 0,
  };
}
