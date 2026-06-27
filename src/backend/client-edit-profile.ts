import { supabase } from "@/lib/supabase";

export interface ClientProfileData {
  fullName: string;
  username: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  activeRole: string;
  profileImage: string;
  createdAt: string;
}

export async function fetchClientProfileData(): Promise<ClientProfileData | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const userId = authData.user.id;
  const authEmail = authData.user.email ?? "";

  const { data, error } = await supabase
    .from("client_profiles")
    .select("full_name, username, email, date_of_birth, gender, location, active_role, profile_image, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const p = data as Record<string, unknown>;

  return {
    fullName:     (p.full_name     as string) ?? "",
    username:     (p.username      as string) ?? "",
    email:        (p.email         as string) ?? authEmail,
    dateOfBirth:  (p.date_of_birth as string) ?? "",
    gender:       (p.gender        as string) ?? "",
    location:     (p.location      as string) ?? "",
    activeRole:   (p.active_role   as string) ?? "",
    profileImage: (p.profile_image as string) ?? "",
    createdAt:    (p.created_at    as string) ?? "",
  };
}

export async function updateClientProfileData(data: ClientProfileData): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;

  const { error: profileError } = await supabase
    .from("client_profiles")
    .update({
      full_name:     data.fullName,
      username:      data.username,
      email:         data.email,
      date_of_birth: data.dateOfBirth || null,
      gender:        data.gender,
      location:      data.location,
      profile_image: data.profileImage,
    })
    .eq("id", userId);

  if (profileError) throw new Error(profileError.message);
}

export type ClientProfileStats = {
  tradersLiked: number;
  avgRatingGiven: number;
  totalBookings: number;
};

export async function fetchClientProfileStats(): Promise<ClientProfileStats> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { tradersLiked: 0, avgRatingGiven: 0, totalBookings: 0 };
  const uid = authData.user.id;

  const [likesRes, reviewsRes, bookingsRes] = await Promise.all([
    supabase.from("client_likes").select("tradesperson_id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("client_reviews").select("review_rating").eq("client_id", uid),
    supabase.from("client_bookings").select("id", { count: "exact", head: true }).eq("client_id", uid),
  ]);

  const tradersLiked = likesRes.count ?? 0;
  const totalBookings = bookingsRes.count ?? 0;

  const ratings = ((reviewsRes.data ?? []) as { review_rating: number }[]).map((r) => r.review_rating);
  const avgRatingGiven = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0;

  return { tradersLiked, avgRatingGiven, totalBookings };
}

export async function uploadClientProfileImage(
  file: File,
  _username: string,
  oldImageUrl: string
): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;

  // Delete the old image if one exists
  if (oldImageUrl) {
    const marker = "/client_profiles/";
    const idx = oldImageUrl.indexOf(marker);
    if (idx !== -1) {
      const oldPath = oldImageUrl.slice(idx + marker.length);
      await supabase.storage.from("client_profiles").remove([oldPath]);
    }
  }

  const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.");

  const folder = userId;
  const path = `${folder}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("client_profiles")
    .upload(path, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("client_profiles").getPublicUrl(path);
  return data.publicUrl;
}
