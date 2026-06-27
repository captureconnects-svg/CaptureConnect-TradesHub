-- Creates return_request and return_requestEvidence tables with RLS.
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).

-- ── 1. return_request ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.return_request (
  id               bigint            GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id         bigint            REFERENCES public.client_shopping(id)  ON DELETE SET NULL,
  booking_id       uuid              REFERENCES public.client_bookings(id)   ON DELETE SET NULL,
  client_id        uuid              NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  tradesperson_id  uuid              NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  reason           text              NOT NULL,
  status           text              NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'pro_approved', 'pro_declined', 'refunded')),
  refund_type      text              CHECK (refund_type IN ('full', 'partial')),
  partial_amount   numeric(10, 2),
  created_at       timestamptz       NOT NULL DEFAULT now()
);

ALTER TABLE public.return_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can insert own return requests"   ON public.return_request;
DROP POLICY IF EXISTS "Clients can view own return requests"     ON public.return_request;
DROP POLICY IF EXISTS "Pros can view requests for their jobs"    ON public.return_request;
DROP POLICY IF EXISTS "Pros can update requests for their jobs"  ON public.return_request;
DROP POLICY IF EXISTS "Admins can view all return requests"      ON public.return_request;
DROP POLICY IF EXISTS "Admins can update all return requests"    ON public.return_request;

CREATE POLICY "Clients can insert own return requests"
ON public.return_request FOR INSERT TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can view own return requests"
ON public.return_request FOR SELECT TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Pros can view requests for their jobs"
ON public.return_request FOR SELECT TO authenticated
USING (tradesperson_id = auth.uid());

CREATE POLICY "Pros can update requests for their jobs"
ON public.return_request FOR UPDATE TO authenticated
USING (tradesperson_id = auth.uid())
WITH CHECK (tradesperson_id = auth.uid());

CREATE POLICY "Admins can view all return requests"
ON public.return_request FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid() AND a.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update all return requests"
ON public.return_request FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid() AND a.role IN ('admin', 'super_admin')
  )
);

-- ── 2. return_requestEvidence ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.return_requestEvidence (
  id          bigint   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id  bigint   NOT NULL REFERENCES public.return_request(id) ON DELETE CASCADE,
  file_url    text     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.return_requestEvidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can insert evidence"  ON public.return_requestEvidence;
DROP POLICY IF EXISTS "Clients can view own evidence" ON public.return_requestEvidence;
DROP POLICY IF EXISTS "Pros can view related evidence" ON public.return_requestEvidence;
DROP POLICY IF EXISTS "Admins can view all evidence"  ON public.return_requestEvidence;

CREATE POLICY "Clients can insert evidence"
ON public.return_requestEvidence FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.return_request rr
    WHERE rr.id = request_id AND rr.client_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own evidence"
ON public.return_requestEvidence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.return_request rr
    WHERE rr.id = request_id AND rr.client_id = auth.uid()
  )
);

CREATE POLICY "Pros can view related evidence"
ON public.return_requestEvidence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.return_request rr
    WHERE rr.id = request_id AND rr.tradesperson_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all evidence"
ON public.return_requestEvidence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid() AND a.role IN ('admin', 'super_admin')
  )
);
