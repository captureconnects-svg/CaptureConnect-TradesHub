-- ── exchange_rates table ────────────────────────────────────────────────────
-- Stores the most recent live rates for USD↔JMD pairs.
-- Rows are upserted by the update-exchange-rates scheduled Edge Function.
-- Clients read from this table via getCachedRate() to avoid cold conversions.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  currency_pair text        PRIMARY KEY,
  rate          numeric     NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed rows so the table always has an entry for both directions.
-- rate starts at 0; the scheduled function will populate live values.
INSERT INTO public.exchange_rates (currency_pair, rate)
VALUES
  ('USD_JMD', 0),
  ('JMD_USD', 0)
ON CONFLICT DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read rates for display purposes
DROP POLICY IF EXISTS "Public read exchange_rates" ON public.exchange_rates;
CREATE POLICY "Public read exchange_rates"
  ON public.exchange_rates FOR SELECT
  USING (true);

-- Only the service role (Edge Function) may update rates
DROP POLICY IF EXISTS "Service role can update exchange_rates" ON public.exchange_rates;
CREATE POLICY "Service role can update exchange_rates"
  ON public.exchange_rates FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
