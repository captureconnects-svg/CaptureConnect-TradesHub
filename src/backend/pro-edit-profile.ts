import { supabase } from "@/lib/supabase";

export type DiscountCode = {
  id: number;
  code: string;
  discount: number;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  active: boolean;
};


export type WorkDay = {
  id: number;
  workday: string;
  startTime: string;
  endTime: string;
};

export type ServicePackage = {
  id: number;
  name: string;
  price: string;
  duration: number;
  description: string;
  features: string;
};

export type TradeAddon = {
  id: number;
  name: string;
  price: string;
};

export type Faq = {
  id: number;
  question: string;
  answer: string;
};

export interface EditProfileData {
  fullName: string;
  username: string;
  dob: string;
  gender: string;
  email: string;
  location: string;
  yearsExp: string;
  bio: string;
  certifications: string[];
  tradeSpecialties: string[];
  profileVisibility: boolean;
  responseTime: number;
  activeRole: string;
  profileImage: string;
  tradeSpecialty: string;
  workDays: WorkDay[];
  discountCodes: DiscountCode[];
  packages: ServicePackage[];
  addons: TradeAddon[];
  faqs: Faq[];
}

export async function ensureProProfileExists(): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return;

  const userId = authData.user.id;
  const meta = authData.user.user_metadata ?? {};
  const fullName = (meta.full_name as string) ?? "";
  const username = (meta.username as string) ?? "";
  const email = authData.user.email ?? "";

  await supabase
    .from("tradesperson_profiles")
    .upsert({ id: userId, full_name: fullName, username, email, active_role: true }, { onConflict: "id", ignoreDuplicates: true });
}

export async function fetchProProfileData(): Promise<EditProfileData | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const userId = authData.user.id;
  const authEmail = authData.user.email ?? "";

  const [
    profileRes,
    discountRes,
    faqRes,
    workDaysRes,
    addOnsRes,
    packagesRes,
    certificationRes,
    tradeSpecialtyRes,
  ] = await Promise.all([
    supabase.from("tradesperson_profiles").select("*").eq("id", userId).single(),
    supabase.from("tradesperson_discountCode").select("*").eq("tradesperson_id", userId),
    supabase.from("tradesperson_FAQ").select("*").eq("tradesperson_id", userId),
    supabase.from("tradesperson_WorkDays").select("*").eq("tradesperson_id", userId),
    supabase.from("tradesperson_addOns").select("*").eq("tradesperson_id", userId),
    supabase.from("tradesperson_packages").select("*").eq("tradesperson_id", userId),
    supabase.from("tradesperson_certification").select("*").eq("tradesperson_id", userId),
    supabase.from("tradesperson_specialty").select("*").eq("tradesperson_id", userId),
  ]);

  const p = profileRes.data as Record<string, unknown> | null;

  return {
    fullName:          (p?.full_name          as string)  ?? "",
    username:          (p?.username           as string)  ?? "",
    dob:               (p?.date_of_birth      as string)  ?? "",
    gender:            (p?.gender             as string)  ?? "",
    email:             (p?.email              as string)  ?? authEmail,
    location:          (p?.location           as string)  ?? "",
    yearsExp:          String(p?.years_of_experience       ?? ""),
    bio:               (p?.about              as string)  ?? "",
    certifications:    ((certificationRes.data ?? []) as Record<string, unknown>[]).map((r) => r.certification as string),
    tradeSpecialties:  ((tradeSpecialtyRes.data ?? []) as Record<string, unknown>[]).map((r) => r.specialty as string),
    profileVisibility: (p?.profile_visibility as boolean) ?? false,
    responseTime:      (p?.response_time      as number)  ?? 0,
    activeRole:        (p?.active_role        as string)  ?? "",
    profileImage:      (p?.profile_image      as string)  ?? "",
    tradeSpecialty:    "",
    workDays: ((workDaysRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as number,
      workday: (r.workday as string) ?? "",
      startTime: (r.startTime as string) ?? "",
      endTime: (r.endTime as string) ?? "",
    })),
    discountCodes: ((discountRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id:         r.id              as number,
      code:       r.code_id         as string,
      discount:   r.code_percentage as number,
      validFrom:  r.code_start      as string,
      validUntil: r.code_end        as string,
      maxUses:    String(r.code_maxUse ?? ""),
      active:     r.code_status     as boolean,
    })),
    packages: ((packagesRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id:          r.id               as number,
      name:        r.package_name     as string,
      price:       String(r.package_price ?? ""),
      duration:    r.package_duration as number,
      description: r.package_desc     as string,
      features:    r.package_feat     as string,
    })),
    addons: ((addOnsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id:    r.id         as number,
      name:  r.addOn_name as string,
      price: String(r.addOn_price ?? ""),
    })),
    faqs: ((faqRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id:       r.id           as number,
      question: r.FAQ_question as string,
      answer:   r.FAQ_answer   as string,
    })),
  };
}

export async function updateProProfileData(data: EditProfileData): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;

  const { error: authUpdateError } = await supabase.auth.updateUser({ email: data.email });
  if (authUpdateError) throw new Error(authUpdateError.message);

  const { error: profileError } = await supabase.from("tradesperson_profiles").upsert({
    id:                 userId,
    full_name:          data.fullName,
    username:           data.username,
    date_of_birth:      data.dob || null,
    gender:             data.gender,
    email:              data.email,
    location:           data.location,
    years_of_experience:  data.yearsExp !== "" ? Number(data.yearsExp) : null,
    about:              data.bio,
    profile_visibility: data.profileVisibility,
    response_time:      data.responseTime,
    profile_image:      data.profileImage,
  });
  if (profileError) throw new Error(profileError.message);

  const [dcDel, faqDel, wdDel, aoDel, pkgDel, certDel, tsDel] = await Promise.all([
    supabase.from("tradesperson_discountCode").delete().eq("tradesperson_id", userId),
    supabase.from("tradesperson_FAQ").delete().eq("tradesperson_id", userId),
    supabase.from("tradesperson_WorkDays").delete().eq("tradesperson_id", userId),
    supabase.from("tradesperson_addOns").delete().eq("tradesperson_id", userId),
    supabase.from("tradesperson_packages").delete().eq("tradesperson_id", userId),
    supabase.from("tradesperson_certification").delete().eq("tradesperson_id", userId),
    supabase.from("tradesperson_specialty").delete().eq("tradesperson_id", userId),
  ]);

  for (const { error } of [dcDel, faqDel, wdDel, aoDel, pkgDel, certDel, tsDel]) {
    if (error) throw new Error(error.message);
  }

  const inserts: PromiseLike<{ error: { message: string } | null }>[] = [];

  if (data.discountCodes.length > 0) {
    inserts.push(
      supabase.from("tradesperson_discountCode").insert(
        data.discountCodes.map((dc) => ({
          tradesperson_id: userId,
          code_id:         dc.code,
          code_percentage: dc.discount,
          code_start:      dc.validFrom || null,
          code_end:        dc.validUntil || null,
          code_maxUse:     dc.maxUses !== "" ? Number(dc.maxUses) : null,
          code_status:     dc.active,
        }))
      )
    );
  }

  if (data.faqs.length > 0) {
    inserts.push(
      supabase.from("tradesperson_FAQ").insert(
        data.faqs.map((faq) => ({
          tradesperson_id: userId,
          FAQ_question:    faq.question,
          FAQ_answer:      faq.answer,
        }))
      )
    );
  }


  if (data.workDays.length > 0) {
    inserts.push(
      supabase.from("tradesperson_WorkDays").insert(
        data.workDays.map((wd) => ({
          tradesperson_id: userId,
          workday:         wd.workday,
          startTime:       wd.startTime,
          endTime:         wd.endTime,
        }))
      )
    );
  }

  if (data.addons.length > 0) {
    inserts.push(
      supabase.from("tradesperson_addOns").insert(
        data.addons.map((a) => ({
          tradesperson_id: userId,
          addOn_name:      a.name,
          addOn_price:     a.price,
        }))
      )
    );
  }

  if (data.packages.length > 0) {
    inserts.push(
      supabase.from("tradesperson_packages").insert(
        data.packages.map((pkg) => ({
          tradesperson_id:  userId,
          package_name:     pkg.name,
          package_desc:     pkg.description,
          package_price:    pkg.price,
          package_duration: pkg.duration,
          package_feat:     pkg.features,
        }))
      )
    );
  }

  if (data.certifications.length > 0) {
    inserts.push(
      supabase.from("tradesperson_certification").insert(
        data.certifications.map((cert) => ({
          tradesperson_id: userId,
          certification:   cert,
        }))
      )
    );
  }

  if (data.tradeSpecialties.length > 0) {
    inserts.push(
      supabase.from("tradesperson_specialty").insert(
        data.tradeSpecialties.map((specialty) => ({
          tradesperson_id: userId,
          specialty,
        }))
      )
    );
  }

  const results = await Promise.all(inserts);
  for (const { error } of results) {
    if (error) throw new Error(error.message);
  }
}

export async function uploadProProfileImage(file: File): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("pro_profiles")
    .upload(path, file, { upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("pro_profiles").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProProfileImage(imageUrl: string): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return;

  // Extract path after bucket name from the public URL
  const marker = "/pro_profiles/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return;
  const path = imageUrl.slice(idx + marker.length);

  await supabase.storage.from("pro_profiles").remove([path]);
}
