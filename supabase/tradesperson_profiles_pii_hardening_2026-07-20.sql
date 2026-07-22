-- tradesperson_profiles PII hardening (audit follow-up #2, 2026-07-20).
--
-- "Anyone can view tradesperson profiles" (TO anon, authenticated USING true)
-- grants row access to the WHOLE row, and Postgres RLS has no concept of
-- per-column policies — so this single policy, needed for legitimate
-- marketplace browsing (name/photo/location/bio), was also handing out
-- date_of_birth, gender, and email for every tradesperson to any
-- unauthenticated visitor who queries the REST API directly. Confirmed via
-- src/backend/client-trader-profile.ts:149 (`select("*")` on the public
-- trader-profile card) that this wasn't just theoretical — the app itself
-- was shipping dob/gender/email in the network response of every profile
-- page view.
--
-- Fix: split the "anyone can browse" surface from the "owner/relationship"
-- surface.
--   - A plain (non security-invoker) view exposing only public-safe columns,
--     grantable to anon/authenticated regardless of row ownership.
--   - The base table's blanket true-for-anon/authenticated SELECT policy is
--     replaced with three narrower ones: owner, admin (unchanged), and a
--     booking/review-relationship policy for the few call sites that
--     legitimately need a pro's *email* (client-bookings.ts, client-reviews.ts
--     read it to notify the pro they just booked/reviewed).
--
-- Safe to re-run: policies dropped by name before recreation; view uses
-- CREATE OR REPLACE.

-- ── Public-safe view (no dob/gender/email) ─────────────────────────────────

create or replace view public.tradesperson_public_profiles as
select
  id, full_name, username, location, about, years_of_experience,
  profile_visibility, response_time, profile_image, delivery_fee,
  active_role, account_status, role, created_at
from public.tradesperson_profiles;

grant select on public.tradesperson_public_profiles to anon, authenticated;

-- ── Base table: replace the blanket policy with scoped ones ───────────────

drop policy if exists "Anyone can view tradesperson profiles" on public.tradesperson_profiles;
drop policy if exists "Pros can view own profile" on public.tradesperson_profiles;
drop policy if exists "Related clients can view pro contact info" on public.tradesperson_profiles;

create policy "Pros can view own profile"
on public.tradesperson_profiles for select
to authenticated
using (id = auth.uid());

create policy "Related clients can view pro contact info"
on public.tradesperson_profiles for select
to authenticated
using (
  exists (
    select 1 from public.client_bookings b
    where b.tradesperson_id = tradesperson_profiles.id and b.client_id = auth.uid()
  )
  or exists (
    select 1 from public.client_reviews r
    where r.tradesperson_id = tradesperson_profiles.id and r.client_id = auth.uid()
  )
);

-- "Admins can view all tradesperson profiles" (is_admin()) is untouched.
