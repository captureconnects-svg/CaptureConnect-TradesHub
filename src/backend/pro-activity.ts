import { supabase } from "@/lib/supabase";

export type ActivityType =
  | "profile_view"
  | "booking"
  | "message"
  | "review"
  | "payment"
  | "order"
  | "like";

export type ActivityRecord = {
  id: number;
  clientId: string | null;
  tradespersonId: string;
  activityType: ActivityType;
  description: string;
  createdAt: string;
  expiredAt: string;
};

export async function logActivity(params: {
  tradespersonId: string;
  activityType: ActivityType;
  description: string;
  clientId?: string | null;
}): Promise<void> {
  const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("client_activity").insert({
    client_id: params.clientId ?? null,
    tradesperson_id: params.tradespersonId,
    activity_type: params.activityType,
    description: params.description,
    expired_at: expiredAt,
  });
}

export async function fetchProActivity(limit = 100): Promise<ActivityRecord[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("client_activity")
    .select("id, client_id, tradesperson_id, activity_type, description, created_at, expired_at")
    .eq("tradesperson_id", authData.user.id)
    .gt("expired_at", now)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as number,
    clientId: r.client_id as string | null,
    tradespersonId: r.tradesperson_id as string,
    activityType: r.activity_type as ActivityType,
    description: r.description as string,
    createdAt: r.created_at as string,
    expiredAt: r.expired_at as string,
  }));
}

export async function fetchProActivityStats(): Promise<{
  total: number;
  reviews: number;
  likes: number;
  profileViews: number;
  bookings: number;
  messages: number;
  payments: number;
  orders: number;
}> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { total: 0, reviews: 0, likes: 0, profileViews: 0, bookings: 0, messages: 0, payments: 0, orders: 0 };
  }

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("client_activity")
    .select("activity_type")
    .eq("tradesperson_id", authData.user.id)
    .gt("expired_at", now);

  const counts = { total: 0, reviews: 0, likes: 0, profileViews: 0, bookings: 0, messages: 0, payments: 0, orders: 0 };
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    counts.total++;
    switch (row.activity_type as ActivityType) {
      case "review":       counts.reviews++;      break;
      case "like":         counts.likes++;        break;
      case "profile_view": counts.profileViews++; break;
      case "booking":      counts.bookings++;     break;
      case "message":      counts.messages++;     break;
      case "payment":      counts.payments++;     break;
      case "order":        counts.orders++;       break;
    }
  }
  return counts;
}
