-- Fixes for tables whose ONLY working read/write policy turned out to be the
-- dormant "FOR ALL TO public USING true" stray policy dropped this morning by
-- fix_stray_open_policies_drop_only.sql. That script assumed every table in
-- its list already had complete, correctly-scoped policies alongside the
-- stray one and only needed the stray one removed — true for most tables,
-- but false for client_reviews and client_shopping, which had NO other
-- policy granting the access clients/pros actually need. Right now, in
-- production: checkout (client_shopping insert/select) and the reviews
-- feature (client_reviews select) are broken for everyone but admins.
--
-- Also fixes client_profiles, which never had the "Anyone can view" pattern
-- but has always had a broken pro-read policy (compared a client_bookings
-- row's own id to its own client_id — a self-reference that can never be
-- true — instead of correlating to the outer client_profiles row), plus adds
-- a public-safe view so the review/conversation/landing-page code that looks
-- up *other* users' display names doesn't need full-row (email/dob/gender)
-- access, mirroring tradesperson_profiles_pii_hardening_2026-07-20.sql.
--
-- And drops one more dead-drift policy on return_request matching the same
-- "auth.jwt() ->> 'app_role'" pattern already cleaned out of storage.objects.
--
-- Safe to re-run.

-- ── client_reviews: reviews are public marketplace content ────────────────

drop policy if exists "Anyone can view reviews" on public.client_reviews;
create policy "Anyone can view reviews"
on public.client_reviews for select
to anon, authenticated
using (true);

-- ── client_shopping: clients need to place + view their own orders, ───────
-- ── pros need to view + fulfil orders placed with them ────────────────────

drop policy if exists "Clients can insert own orders" on public.client_shopping;
create policy "Clients can insert own orders"
on public.client_shopping for insert
to authenticated
with check (client_id = auth.uid());

drop policy if exists "Clients can view own orders" on public.client_shopping;
create policy "Clients can view own orders"
on public.client_shopping for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Pros can view own orders" on public.client_shopping;
create policy "Pros can view own orders"
on public.client_shopping for select
to authenticated
using (tradesperson_id = auth.uid());

drop policy if exists "Pros can update own orders" on public.client_shopping;
create policy "Pros can update own orders"
on public.client_shopping for update
to authenticated
using (tradesperson_id = auth.uid())
with check (tradesperson_id = auth.uid());
-- (pricing_and_status_tamper_guard trigger still blocks pros from touching
-- total_price/sub_total/shipping_total through this policy.)

-- ── client_profiles: public-safe view + fix the broken pro-read policy ────

create or replace view public.client_public_profiles as
select id, full_name, username, profile_image, location, created_at
from public.client_profiles;

grant select on public.client_public_profiles to anon, authenticated;

drop policy if exists "Pros can view client profiles for their bookings" on public.client_profiles;
drop policy if exists "Related pros can view client contact info" on public.client_profiles;
create policy "Related pros can view client contact info"
on public.client_profiles for select
to authenticated
using (
  exists (
    select 1 from public.client_bookings b
    where b.client_id = client_profiles.id and b.tradesperson_id = auth.uid()
  )
  or exists (
    select 1 from public.client_shopping s
    where s.client_id = client_profiles.id and s.tradesperson_id = auth.uid()
  )
  or exists (
    select 1 from public.return_request rr
    where rr.client_id = client_profiles.id and rr.tradesperson_id = auth.uid()
  )
);

-- ── return_request: drop dead drift policy (same shape as the storage one) ─

drop policy if exists "admins_all_return_requests" on public.return_request;
