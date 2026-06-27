-- RLS policies for merchandise tables.
-- Products and images are public (marketplace listings).
-- Only the owning tradesperson can write their own records.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ── tradesperson_SellersSpecialty ──────────────────────────────────────────────

ALTER TABLE public."tradesperson_SellersSpecialty" ENABLE ROW LEVEL SECURITY;

-- Products are publicly visible (marketplace).
DROP POLICY IF EXISTS "Anyone can view products" ON public."tradesperson_SellersSpecialty";
CREATE POLICY "Anyone can view products"
ON public."tradesperson_SellersSpecialty" FOR SELECT
TO anon, authenticated
USING (true);

-- Only the owner can create, update, or delete their own products.
DROP POLICY IF EXISTS "Pros can manage own products" ON public."tradesperson_SellersSpecialty";
CREATE POLICY "Pros can manage own products"
ON public."tradesperson_SellersSpecialty" FOR ALL
TO authenticated
USING (tradesperson_id = auth.uid())
WITH CHECK (tradesperson_id = auth.uid());

-- Admins can manage any product.
DROP POLICY IF EXISTS "Admins can manage all products" ON public."tradesperson_SellersSpecialty";
CREATE POLICY "Admins can manage all products"
ON public."tradesperson_SellersSpecialty" FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ── tradesperson_Sell.Spe.variant ──────────────────────────────────────────────

ALTER TABLE public."tradesperson_Sell.Spe.variant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view variants" ON public."tradesperson_Sell.Spe.variant";
CREATE POLICY "Anyone can view variants"
ON public."tradesperson_Sell.Spe.variant" FOR SELECT
TO anon, authenticated
USING (true);

-- Writes are allowed only when the caller owns the parent product.
DROP POLICY IF EXISTS "Pros can manage own variants" ON public."tradesperson_Sell.Spe.variant";
CREATE POLICY "Pros can manage own variants"
ON public."tradesperson_Sell.Spe.variant" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."tradesperson_SellersSpecialty" p
    WHERE p.id = product_id AND p.tradesperson_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."tradesperson_SellersSpecialty" p
    WHERE p.id = product_id AND p.tradesperson_id = auth.uid()
  )
);

-- ── tradesperson_Sell.Spe.images ───────────────────────────────────────────────

ALTER TABLE public."tradesperson_Sell.Spe.images" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product images" ON public."tradesperson_Sell.Spe.images";
CREATE POLICY "Anyone can view product images"
ON public."tradesperson_Sell.Spe.images" FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Pros can manage own product images" ON public."tradesperson_Sell.Spe.images";
CREATE POLICY "Pros can manage own product images"
ON public."tradesperson_Sell.Spe.images" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."tradesperson_SellersSpecialty" p
    WHERE p.id = product_id AND p.tradesperson_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."tradesperson_SellersSpecialty" p
    WHERE p.id = product_id AND p.tradesperson_id = auth.uid()
  )
);
