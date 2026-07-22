import { supabase } from "@/lib/supabase";
import { ensureProProfileExists } from "@/backend/pro-edit-profile";

export type BankDetails = {
  fullName: string;
  nameOfBank: string;
  bankBranch: string;
  accountType: string;
  accountNumber: string;
  homeAddress: string;
  phone: string;
  country: string;
  currency: string;
};

export async function fetchBankDetails(): Promise<BankDetails | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tradesperson_banking_details")
    .select("full_name, name_of_bank, bank_branch, account_type, account_number, home_address, phone, country, currency")
    .eq("tradesperson_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    fullName: String(data.full_name ?? ""),
    nameOfBank: String(data.name_of_bank ?? ""),
    bankBranch: String(data.bank_branch ?? ""),
    accountType: String(data.account_type ?? ""),
    accountNumber: data.account_number != null ? String(data.account_number) : "",
    homeAddress: String(data.home_address ?? ""),
    phone: String(data.phone ?? ""),
    country: String(data.country ?? ""),
    currency: String(data.currency ?? ""),
  };
}

export async function saveBankDetails(input: BankDetails): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const accountNumber = Number(input.accountNumber.replace(/\s+/g, ""));
  if (!Number.isFinite(accountNumber)) {
    throw new Error("Account number must be numeric.");
  }

  // tradesperson_id has a FK to tradesperson_profiles(id). That row is normally
  // created by ensureProProfileExists() on dashboard load, but it's fired there
  // without being awaited, so a pro reaching this form quickly (or via direct
  // URL) can race ahead of it and hit a FK violation on insert. Make sure the
  // profile row exists before writing banking details.
  await ensureProProfileExists();

  const payload = {
    tradesperson_id: authData.user.id,
    full_name: input.fullName,
    name_of_bank: input.nameOfBank,
    bank_branch: input.bankBranch,
    account_type: input.accountType,
    account_number: accountNumber,
    home_address: input.homeAddress,
    phone: input.phone,
    country: input.country,
    currency: input.currency,
  };

  const { data: existing, error: fetchError } = await supabase
    .from("tradesperson_banking_details")
    .select("id")
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    const { error } = await supabase
      .from("tradesperson_banking_details")
      .update(payload)
      .eq("id", existing.id as number);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tradesperson_banking_details").insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function deleteBankDetails(): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("tradesperson_banking_details")
    .delete()
    .eq("tradesperson_id", authData.user.id);
  if (error) throw new Error(error.message);
}
