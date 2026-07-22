-- The 14-day return window for a shopping order should start when the item
-- is actually handed over (delivered or picked up), not when the order was
-- placed. isDelivered already tracks the pro marking fulfillment, but there
-- was no timestamp for *when* that happened, so the client couldn't compute
-- an accurate return deadline.
ALTER TABLE public.client_shopping
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Backfill: orders already marked delivered/picked up get delivered_at
-- approximated from created_at so existing rows aren't stuck with a null
-- return window start.
UPDATE public.client_shopping
SET delivered_at = created_at
WHERE "isDelivered" = true AND delivered_at IS NULL;
