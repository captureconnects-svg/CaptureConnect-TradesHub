-- Payout receipt records + private storage bucket for proof-of-payout files
-- an admin attaches to the "Notify Payout Sent" email (Admin Reports → Pros
-- table → Notify Payout Sent dialog; see NotifyPayoutSentDialog in
-- admin-dashboard.tsx and sendPayoutSentNotification in src/backend/admin.ts).
-- Run in the Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.payout_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tradesperson_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount          numeric(10, 2) NOT NULL,
  -- Path within the payout_receipts storage bucket, e.g. "{tradesperson_id}/{timestamp}.pdf".
  file_path       text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_receipts_tradesperson_id_idx ON public.payout_receipts(tradesperson_id);

ALTER TABLE public.payout_receipts ENABLE ROW LEVEL SECURITY;

-- Storage RLS policies cannot query auth.users directly, so the admin check is
-- wrapped in a SECURITY DEFINER function (same pattern as
-- return_evidence_storage_policies.sql's is_return_evidence_admin) and reused
-- for both the table policy below and the bucket policies further down.
CREATE OR REPLACE FUNCTION public.is_payout_receipts_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
$$;

DROP POLICY IF EXISTS "Admins can manage payout receipts" ON public.payout_receipts;
DROP POLICY IF EXISTS "Pros can view own payout receipts" ON public.payout_receipts;

CREATE POLICY "Admins can manage payout receipts"
ON public.payout_receipts FOR ALL
TO authenticated
USING (public.is_payout_receipts_admin())
WITH CHECK (public.is_payout_receipts_admin());

CREATE POLICY "Pros can view own payout receipts"
ON public.payout_receipts FOR SELECT
TO authenticated
USING (tradesperson_id = auth.uid());

-- ── Storage bucket ───────────────────────────────────────────────────────
-- Private (not public) — every receipt is proof of a real money transfer, so
-- access goes through signed URLs only, same as return_evidence.

INSERT INTO storage.buckets (id, name, public)
VALUES ('payout_receipts', 'payout_receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can upload payout receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read payout receipts"   ON storage.objects;
DROP POLICY IF EXISTS "Pros can read own payout receipts" ON storage.objects;

CREATE POLICY "Admins can upload payout receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payout_receipts' AND
  public.is_payout_receipts_admin()
);

CREATE POLICY "Admins can read payout receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payout_receipts' AND
  public.is_payout_receipts_admin()
);

-- Path convention: {tradesperson_id}/{timestamp}.{ext} — first path segment
-- is the owning pro, same convention as return_evidence.
CREATE POLICY "Pros can read own payout receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payout_receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
