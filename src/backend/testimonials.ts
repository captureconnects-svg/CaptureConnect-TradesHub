import { supabase } from "@/lib/supabase";

export type TestimonialStatus = "pending" | "approved" | "rejected";

export type VideoTestimonialRecord = {
  id: number;
  userId: string;
  name: string;
  userType: string;
  description: string;
  videoUrl: string;
  status: TestimonialStatus;
  createdAt: string;
};

function mapRow(r: Record<string, unknown>): VideoTestimonialRecord {
  return {
    id:          r.id          as number,
    userId:      r.user_id     as string,
    name:        r.name        as string,
    userType:    r.userType    as string,
    description: r.description as string,
    videoUrl:    r.video_URL   as string,
    status:      r.status      as TestimonialStatus,
    createdAt:   r.created_at  as string,
  };
}

export async function fetchApprovedTestimonials(): Promise<VideoTestimonialRecord[]> {
  const { data, error } = await supabase
    .from("landing_testimonials")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return (data as Record<string, unknown>[]).map(mapRow);
}

export async function fetchMyTestimonials(): Promise<VideoTestimonialRecord[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("landing_testimonials")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return (data as Record<string, unknown>[]).map(mapRow);
}

export async function uploadTestimonialVideo(file: File): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop() ?? "mp4";
  const path = `${authData.user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("landing_testimonials")
    .upload(path, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from("landing_testimonials")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function submitTestimonial(params: {
  name: string;
  userType: string;
  description: string;
  videoUrl: string;
}): Promise<VideoTestimonialRecord> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("landing_testimonials")
    .insert({
      user_id:     authData.user.id,
      name:        params.name,
      userType:    params.userType,
      description: params.description,
      video_URL:   params.videoUrl,
      status:      "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function deleteTestimonial(id: number, videoUrl: string): Promise<void> {
  const { error } = await supabase
    .from("landing_testimonials")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  const bucket = "landing_testimonials";
  const marker = `/${bucket}/`;
  const idx = videoUrl.indexOf(marker);
  if (idx !== -1) {
    const storagePath = videoUrl.slice(idx + marker.length);
    await supabase.storage.from(bucket).remove([storagePath]);
  }
}
