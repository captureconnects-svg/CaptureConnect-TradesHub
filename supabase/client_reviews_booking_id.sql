-- Adds booking_id to client_reviews for per-booking review tracking + RLS policies.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ── Column ────────────────────────────────────────────────────────────────────
ALTER TABLE public.client_reviews
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.client_bookings(id) ON DELETE SET NULL;

-- ── Unique: one review per booking ───────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS client_reviews_booking_id_key
  ON public.client_reviews (booking_id)
  WHERE booking_id IS NOT NULL;

-- ── RLS: clients can insert their own reviews ─────────────────────────────────
DROP POLICY IF EXISTS "Clients can insert reviews" ON public.client_reviews;
CREATE POLICY "Clients can insert reviews"
ON public.client_reviews FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- ── RLS: clients can delete their own reviews ─────────────────────────────────
DROP POLICY IF EXISTS "Clients can delete own reviews" ON public.client_reviews;
CREATE POLICY "Clients can delete own reviews"
ON public.client_reviews FOR DELETE
TO authenticated
USING (client_id = auth.uid());
