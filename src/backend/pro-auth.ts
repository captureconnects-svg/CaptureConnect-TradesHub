import { supabase } from "@/lib/supabase";

export interface ProSignUpData {
  fullName: string;
  gender: string;
  dob: string;
  email: string;
  password: string;
}

export interface ProSignInData {
  email: string;
  password: string;
}

export async function signUpTradesperson(
  data: ProSignUpData
): Promise<void> {
  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          gender: data.gender,
          date_of_birth: data.dob,
        },
      },
    });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authData.user?.id;
  if (userId) {
    const { error: profileError } = await supabase
      .from("tradesperson_profiles")
      .upsert(
        { id: userId, full_name: data.fullName, email: data.email, active_role: true },
        { onConflict: "id" }
      );
    if (profileError) throw new Error(profileError.message);
  }
}

export async function signInTradesperson(data: ProSignInData): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw new Error(error.message);

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) {
    const { data: profile } = await supabase
      .from("tradesperson_profiles")
      .select("active_role")
      .eq("id", authData.user.id)
      .maybeSingle();

    const isInactive = profile && (profile.active_role === false || profile.active_role === "false");
    if (isInactive) {
      await supabase.auth.signOut();
      throw new Error("Your pro account is currently inactive. Switch back to your pro account from your client dashboard settings.");
    }
  }
}