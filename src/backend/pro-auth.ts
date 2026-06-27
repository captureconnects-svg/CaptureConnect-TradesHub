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
  const trimmedName = data.fullName.trim();
  const trimmedEmail = data.email.trim().toLowerCase();

  if (trimmedName.length < 2) throw new Error("Please enter your full name (at least 2 characters).");
  if (data.password.length < 8) throw new Error("Password must be at least 8 characters.");

  if (data.dob) {
    const dob = new Date(data.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) age--;
    if (age < 18) throw new Error("You must be at least 18 years old to create an account.");
  }

  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email: trimmedEmail,
      password: data.password,
      options: {
        data: {
          user_type: "tradesperson",
          full_name: trimmedName,
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
        { id: userId, full_name: trimmedName, email: trimmedEmail, role: "tradesperson", account_status: "active", active_role: true },
        { onConflict: "id" }
      );
    if (profileError) {
      console.error("[pro-auth] profile upsert:", profileError.message);
      throw new Error("Account created but profile setup failed. Please contact support.");
    }
  }
}

export async function signInWithGooglePro(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth-callback?type=pro`,
      queryParams: { user_type: "tradesperson" },
    },
  });
  if (error) throw new Error(error.message);
}

export async function signInTradesperson(data: ProSignInData): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email.trim(),
    password: data.password,
  });

  if (error) throw new Error(error.message);

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;

  const { data: deletedRecord } = await supabase
    .from("deleted_accounts")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (deletedRecord) {
    await supabase.auth.signOut();
    throw new Error("This account has been deleted and cannot be used to sign in.");
  }

  const { data: profile } = await supabase
    .from("tradesperson_profiles")
    .select("active_role, account_status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    throw new Error("No pro account found. Please sign up as a tradesperson or use the Client login.");
  }

  const isInactive = profile.active_role === false || profile.active_role === "false";
  if (isInactive) {
    await supabase.auth.signOut();
    throw new Error("Your pro account is currently inactive. Switch back to your pro account from your client dashboard settings.");
  }

  const status = (profile.account_status as string | null)?.toLowerCase();
  if (status === "suspended") {
    await supabase.auth.signOut();
    throw new Error("Your account has been suspended. Please contact support for assistance.");
  }
  if (status === "deactivated") {
    await supabase.auth.signOut();
    throw new Error("Your account has been deactivated and cannot be used to sign in.");
  }
}