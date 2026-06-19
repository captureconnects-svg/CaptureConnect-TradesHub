import { supabase } from "@/lib/supabase";

export async function fetchDeliveryFee(tradespersonId: string): Promise<number | null> {
  const { data } = await supabase
    .from("tradesperson_profiles")
    .select("delivery_fee")
    .eq("id", tradespersonId)
    .single();
  return (data as Record<string, unknown> | null)?.delivery_fee as number | null ?? null;
}

export async function fetchMyDeliveryFee(): Promise<number | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  return fetchDeliveryFee(authData.user.id);
}

export async function saveDeliveryFee(fee: number | null): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("tradesperson_profiles")
    .update({ delivery_fee: fee })
    .eq("id", authData.user.id);
  if (error) throw new Error(error.message);
}
