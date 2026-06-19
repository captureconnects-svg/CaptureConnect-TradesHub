import { supabase } from "@/lib/supabase";
import { CATEGORIES, type Tradesperson } from "@/lib/trades-data";
import { logActivity } from "@/backend/pro-activity";

export async function fetchClientLikes(clientId: string): Promise<string[]> {
  const { data } = await supabase
    .from("client_likes")
    .select("tradesperson_id")
    .eq("client_id", clientId);
  return (data ?? []).map((row) => row.tradesperson_id as string);
}

export async function fetchLikedTraderProfiles(likedIds: string[]): Promise<Tradesperson[]> {
  if (likedIds.length === 0) return [];

  const [{ data: profiles }, { data: specialties }] = await Promise.all([
    supabase
      .from("tradesperson_profiles")
      .select("id, full_name, username, location, about, profile_image")
      .in("id", likedIds)
      .eq("active_role", true),
    supabase
      .from("tradesperson_specialty")
      .select("tradesperson_id, specialty")
      .in("tradesperson_id", likedIds),
  ]);

  const specialtiesByPro: Record<string, string[]> = {};
  for (const row of specialties ?? []) {
    const pid = row.tradesperson_id as string;
    if (!specialtiesByPro[pid]) specialtiesByPro[pid] = [];
    if (!specialtiesByPro[pid].includes(row.specialty as string)) {
      specialtiesByPro[pid].push(row.specialty as string);
    }
  }

  return (profiles ?? []).map((p) => {
    const id = p.id as string;
    const tradeNames = specialtiesByPro[id] ?? [];
    const primaryCat = CATEGORIES.find((c) => tradeNames.includes(c.name)) ?? CATEGORIES[0];
    const nameParts = String(p.username ?? p.full_name ?? "").split(" ").filter(Boolean);
    const initials = nameParts.slice(0, 2).map((w: string) => w[0].toUpperCase()).join("") || "?";
    return {
      id,
      name: String(p.username ?? p.full_name ?? "Unknown"),
      trade: primaryCat.name,
      categorySlug: primaryCat.slug,
      location: String(p.location ?? ""),
      rating: 0,
      reviews: 0,
      hourly: 0,
      verified: false,
      initials,
      tagline: String(p.about ?? ""),
      specialties: tradeNames,
      startingPrice: 0,
      profileImage: String(p.profile_image ?? ""),
    } satisfies Tradesperson;
  });
}

export async function toggleClientLike(
  clientId: string,
  tradespersonId: string,
  currentlyLiked: boolean,
): Promise<void> {
  if (currentlyLiked) {
    await supabase
      .from("client_likes")
      .delete()
      .eq("client_id", clientId)
      .eq("tradesperson_id", tradespersonId);
  } else {
    await supabase
      .from("client_likes")
      .insert({ client_id: clientId, tradesperson_id: tradespersonId });

    (async () => {
      const { data: cp } = await supabase
        .from("client_profiles")
        .select("full_name, username")
        .eq("id", clientId)
        .single();
      const name =
        (cp?.username as string | null)?.trim() ||
        (cp?.full_name as string | null)?.trim() ||
        "Someone";
      await logActivity({
        tradespersonId,
        activityType: "like",
        description: `${name} saved your profile`,
        clientId,
      });
    })().catch(() => {});
  }
}
