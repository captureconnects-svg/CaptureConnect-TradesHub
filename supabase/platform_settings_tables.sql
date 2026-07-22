-- Centralized marketplace payment configuration, admin-editable.
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Depends on public.is_admin() from admin_rls_policies.sql — run that first.

-- ── platform_settings ─────────────────────────────────────────────────────────
-- Single-row table (like admin_settings) holding the *active* configuration
-- used by the payment engine. `version` increments on every update via the
-- trigger below so payments can record exactly which configuration was live
-- when they were created.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id                          integer PRIMARY KEY DEFAULT 1,
  platform_name               text NOT NULL DEFAULT 'Capture Connect',
  default_currency            text NOT NULL DEFAULT 'USD',
  client_service_fee_percent  numeric(5, 2) NOT NULL DEFAULT 6,
  pro_commission_percent      numeric(5, 2) NOT NULL DEFAULT 14,
  default_payout_hold_days    integer NOT NULL DEFAULT 3,
  refund_window_days          integer NOT NULL DEFAULT 14,
  tax_enabled                 boolean NOT NULL DEFAULT false,
  tax_percent                 numeric(5, 2) NOT NULL DEFAULT 0,
  platform_status             text NOT NULL DEFAULT 'active'
                                 CHECK (platform_status IN ('active', 'maintenance')),
  version                     integer NOT NULL DEFAULT 1,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  updated_by                  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT platform_settings_single_row CHECK (id = 1)
);

-- Seed with the values that were previously hardcoded in
-- src/lib/fees.ts / create-payment-intent, so nothing changes on deploy.
INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Bump the version + updated_at on every change, regardless of what the
-- application layer sets — the payment engine's versioning guarantee
-- depends on this always incrementing.
CREATE OR REPLACE FUNCTION public.platform_settings_bump_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_settings_bump_version_trigger ON public.platform_settings;
CREATE TRIGGER platform_settings_bump_version_trigger
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.platform_settings_bump_version();

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- READ: public — lets checkout pages show the live fee before login, and the
-- payment engine (service role) bypasses RLS entirely anyway.
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- WRITE: admins/super_admins only.
DROP POLICY IF EXISTS "Admins can write platform settings" ON public.platform_settings;
CREATE POLICY "Admins can write platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ── platform_settings_history ───────────────────────────────────────────────
-- One row per changed field per save — the audit trail for "what changed,
-- from what, to what, by whom, and why."

CREATE TABLE IF NOT EXISTS public.platform_settings_history (
  id             bigserial PRIMARY KEY,
  setting_name   text NOT NULL,
  old_value      text,
  new_value      text,
  changed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason  text,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_settings_history_changed_at_idx
  ON public.platform_settings_history(changed_at DESC);

ALTER TABLE public.platform_settings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view settings history" ON public.platform_settings_history;
CREATE POLICY "Admins can view settings history"
ON public.platform_settings_history FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert settings history" ON public.platform_settings_history;
CREATE POLICY "Admins can insert settings history"
ON public.platform_settings_history FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- ── audit_logs: add ip_address ──────────────────────────────────────────────
-- Additive column so existing logAdminAction() callers keep working unchanged;
-- only the new platform-settings audit entries populate it for now.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address text;
