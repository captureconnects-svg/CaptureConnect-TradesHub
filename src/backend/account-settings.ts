import { supabase } from "@/lib/supabase";

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const email = userData.user.email;
  if (!email) throw new Error("No email associated with account");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw new Error("Current password is incorrect");

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(updateError.message);
}

export async function deleteAccount(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");
  const uid = userData.user.id;

  // Step 1: Fetch parent IDs needed to delete child rows
  const [
    { data: convos },
    { data: portfolios },
    { data: products },
  ] = await Promise.all([
    supabase.from("conversations").select("id").or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`),
    supabase.from("tradesperson_portfolios").select("id"), // RLS scopes to current user
    supabase.from("tradesperson_SellersSpecialty").select("id").eq("tradesperson_id", uid),
  ]);

  // Step 2: Delete child DB rows in parallel
  const childDeletes: PromiseLike<unknown>[] = [];

  if (convos?.length) {
    const ids = convos.map((r) => r.id as number);
    childDeletes.push(supabase.from("conversations_msg").delete().in("convo_id", ids));
  }
  if (portfolios?.length) {
    const ids = portfolios.map((r) => r.id as number);
    childDeletes.push(supabase.from("tradesperson_port.media").delete().in("portfolio_id", ids));
  }
  if (products?.length) {
    const ids = products.map((r) => r.id as string);
    childDeletes.push(supabase.from("tradesperson_Sell.Spe.variant").delete().in("product_id", ids));
    childDeletes.push(supabase.from("tradesperson_Sell.Spe.images").delete().in("product_id", ids));
  }

  if (childDeletes.length) await Promise.all(childDeletes);

  // Step 3: Delete storage files and parent DB rows in parallel
  const convoIds = (convos ?? []).map((r) => String(r.id));
  await Promise.all([
    // Storage — uid-rooted buckets
    deleteStorageFolder("client_profiles", uid),
    deleteStorageFolder("pro_profiles", uid),
    deleteStorageFolder("pro_merchandise", uid),
    deleteStorageFolder("pro_portfolios", uid),
    // Storage — conversation attachments (folder per convo ID)
    ...convoIds.map((id) => deleteStorageFolder("conversations", id)),
    // DB parent rows
    supabase.from("conversations").delete().or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`),
    supabase.from("client_likes").delete().or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`),
    supabase.from("client_reviews").delete().or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`),
    supabase.from("client_activity").delete().or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`),
    supabase.from("tradesperson_portfolios").delete(), // RLS scopes to current user
    supabase.from("tradesperson_SellersSpecialty").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_WorkDays").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_FAQ").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_certification").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_packages").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_addOns").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_specialty").delete().eq("tradesperson_id", uid),
    supabase.from("tradesperson_discountCode").delete().eq("tradesperson_id", uid),
    supabase.from("client_profiles").delete().eq("id", uid),
    supabase.from("tradesperson_profiles").delete().eq("id", uid),
  ]);

  // Step 4: Delete the auth user
  const { error } = await supabase.rpc("delete_user");
  if (error) throw new Error(error.message);
}

async function deleteStorageFolder(bucket: string, folder: string): Promise<void> {
  const { data: items } = await supabase.storage.from(bucket).list(folder);
  if (!items?.length) return;

  const filePaths: string[] = [];
  const subFolders: string[] = [];

  for (const item of items) {
    if (item.id === null) {
      subFolders.push(`${folder}/${item.name}`);
    } else {
      filePaths.push(`${folder}/${item.name}`);
    }
  }

  await Promise.all([
    filePaths.length ? supabase.storage.from(bucket).remove(filePaths) : Promise.resolve(),
    ...subFolders.map((sub) => deleteStorageFolder(bucket, sub)),
  ]);
}
