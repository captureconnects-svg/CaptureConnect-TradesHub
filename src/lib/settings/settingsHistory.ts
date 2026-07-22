import { supabase } from "@/lib/supabase";

export type SettingsHistoryEntry = {
  id: number;
  settingName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changeReason: string | null;
  changedAt: string;
};

export async function fetchSettingsHistory(limit = 100): Promise<SettingsHistoryEntry[]> {
  const { data, error } = await supabase
    .from("platform_settings_history")
    .select("id, setting_name, old_value, new_value, changed_by, change_reason, changed_at")
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id as number,
    settingName: String(r.setting_name ?? ""),
    oldValue: (r.old_value as string) ?? null,
    newValue: (r.new_value as string) ?? null,
    changedBy: (r.changed_by as string) ?? null,
    changeReason: (r.change_reason as string) ?? null,
    changedAt: r.changed_at as string,
  }));
}

/** Inserts one platform_settings_history row per changed field. */
export async function recordSettingsChanges(
  changes: { settingName: string; oldValue: unknown; newValue: unknown }[],
  changedBy: string | null,
  changeReason: string | null,
): Promise<void> {
  if (changes.length === 0) return;
  const rows = changes.map((c) => ({
    setting_name: c.settingName,
    old_value: c.oldValue == null ? null : String(c.oldValue),
    new_value: c.newValue == null ? null : String(c.newValue),
    changed_by: changedBy,
    change_reason: changeReason,
  }));
  const { error } = await supabase.from("platform_settings_history").insert(rows);
  if (error) throw new Error(error.message);
}

async function getClientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

/** Writes a single audit_logs entry summarizing a platform settings save, including the admin's IP. */
export async function logSettingsAuditEntry(
  changes: { settingName: string; oldValue: unknown; newValue: unknown }[],
  adminId: string | null,
  adminName: string,
): Promise<void> {
  if (changes.length === 0) return;
  try {
    const ip = await getClientIp();
    await supabase.from("audit_logs").insert({
      admin_id: adminId,
      admin_name: adminName,
      action: "update_platform_settings",
      target_type: "platform_settings",
      ip_address: ip,
      details: JSON.stringify({ changes }),
    });
  } catch {
    // never block the settings save due to a logging failure
  }
}
