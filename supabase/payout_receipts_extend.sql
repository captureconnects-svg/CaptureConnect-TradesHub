-- Extends public.payout_receipts into the full "TradeHub Official Payout
-- Receipt" system: transfer details, a permanent receipt/payout number,
-- the set of payments included in each payout, and a strict split between
-- the admin's private original proof-of-transfer file and the TradeHub-
-- generated PDF the pro is allowed to see. Builds on payout_receipts_table.sql
-- (run that first). Safe to re-run.

-- ── 1. New columns ───────────────────────────────────────────────────────

ALTER TABLE public.payout_receipts
  -- Path within the new admin-only payout_admin_receipts bucket. Optional —
  -- mirrors today's optional receipt-proof upload.
  ADD COLUMN IF NOT EXISTS admin_receipt_records text,
  -- false = a legacy row from before this system existed (only the admin's
  -- raw uploaded file exists for it, no generated PDF) — these are hidden
  -- from the pro entirely via payout_receipts_pro below, never backfilled.
  ADD COLUMN IF NOT EXISTS is_generated_receipt   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_method        text,
  ADD COLUMN IF NOT EXISTS transfer_reference     text,
  ADD COLUMN IF NOT EXISTS transfer_date          date,
  -- Free text, not always a date (e.g. "Within 24 Hours").
  ADD COLUMN IF NOT EXISTS expected_delivery      text,
  -- Admin-only, optional. Never exposed to the pro.
  ADD COLUMN IF NOT EXISTS admin_notes            text,
  ADD COLUMN IF NOT EXISTS status                 text NOT NULL DEFAULT 'Completed',
  ADD COLUMN IF NOT EXISTS currency               text NOT NULL DEFAULT 'USD',
  -- Immutable snapshot of the public.payments rows this payout covered, so
  -- the receipt's line items never change even if those payments' own
  -- columns are touched later.
  ADD COLUMN IF NOT EXISTS payment_ids            uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS receipt_number         text,
  ADD COLUMN IF NOT EXISTS payout_number          text;

-- Existing rows just backfilled to false above; every future insert should
-- default to true (new application code sets it explicitly regardless).
ALTER TABLE public.payout_receipts ALTER COLUMN is_generated_receipt SET DEFAULT true;

-- ── 2. Receipt / payout numbering ───────────────────────────────────────
-- Assigned atomically in a BEFORE INSERT trigger so numbering can't race or
-- collide across concurrent admin sessions. Legacy rows keep these NULL —
-- they predate the trigger and are hidden from the pro anyway.

CREATE SEQUENCE IF NOT EXISTS public.payout_receipt_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.payout_number_seq;

CREATE OR REPLACE FUNCTION public.set_payout_receipt_numbers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'PAYOUT-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.payout_receipt_number_seq')::text, 6, '0');
  END IF;
  IF NEW.payout_number IS NULL THEN
    NEW.payout_number := 'PAY-' || lpad(nextval('public.payout_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payout_receipts_set_numbers ON public.payout_receipts;
CREATE TRIGGER payout_receipts_set_numbers
  BEFORE INSERT ON public.payout_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_payout_receipt_numbers();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_receipts_receipt_number_key') THEN
    ALTER TABLE public.payout_receipts ADD CONSTRAINT payout_receipts_receipt_number_key UNIQUE (receipt_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_receipts_payout_number_key') THEN
    ALTER TABLE public.payout_receipts ADD CONSTRAINT payout_receipts_payout_number_key UNIQUE (payout_number);
  END IF;
END $$;

-- Callable RPC to pre-allocate a receipt/payout number pair *before* the row
-- exists — the admin PDF is generated client-side before the payout_receipts
-- insert (the generated PDF's file bytes are themselves one of the columns
-- being inserted), so the numbers printed on the PDF must be known ahead of
-- the insert. The BEFORE INSERT trigger above only fills these in when NULL,
-- so passing the pre-allocated values through on insert is a no-op for it.
CREATE OR REPLACE FUNCTION public.next_payout_receipt_numbers()
RETURNS TABLE(receipt_number text, payout_number text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    'PAYOUT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payout_receipt_number_seq')::text, 6, '0'),
    'PAY-' || lpad(nextval('public.payout_number_seq')::text, 5, '0')
  WHERE public.is_payout_receipts_admin()
$$;

GRANT EXECUTE ON FUNCTION public.next_payout_receipt_numbers() TO authenticated;

-- ── 3. Pro-facing view — closes the column-level privacy gap ───────────
-- Row Level Security is row-level only: the existing "Pros can view own
-- payout receipts" policy (tradesperson_id = auth.uid()) would let a pro
-- SELECT admin_receipt_records/admin_notes straight off the base table.
-- Instead of relying on application code to never ask for those columns,
-- this view simply never exposes them — same security_invoker pattern as
-- payments_ready_for_payout / payments_awaiting_reconciliation in
-- payments_financial_ledger.sql, so the base table's row policies still
-- apply to whoever queries the view. is_generated_receipt = true also
-- bakes in "legacy rows are hidden from the pro."

CREATE OR REPLACE VIEW public.payout_receipts_pro
WITH (security_invoker = true) AS
SELECT
  id, tradesperson_id, amount, currency, status, receipt_number, payout_number,
  transfer_method, transfer_reference, transfer_date, expected_delivery,
  file_path, payment_ids, created_at
FROM public.payout_receipts
WHERE is_generated_receipt = true;

GRANT SELECT ON public.payout_receipts_pro TO authenticated;

-- ── 4. Admin-only storage bucket for the original proof-of-transfer file ─
-- payout_receipts (existing bucket) is repurposed to hold only the
-- generated, pro-visible PDF going forward — its policies are unchanged
-- (admins: full access; pros: read under their own uid folder). The
-- admin's raw original now goes here instead, where pros have no policy
-- at all, reusing is_payout_receipts_admin() from payout_receipts_table.sql.

INSERT INTO storage.buckets (id, name, public)
VALUES ('payout_admin_receipts', 'payout_admin_receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can upload admin payout receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read admin payout receipts"   ON storage.objects;

CREATE POLICY "Admins can upload admin payout receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payout_admin_receipts' AND
  public.is_payout_receipts_admin()
);

CREATE POLICY "Admins can read admin payout receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payout_admin_receipts' AND
  public.is_payout_receipts_admin()
);
