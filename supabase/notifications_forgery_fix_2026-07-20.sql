-- Close the notification-forgery hole (audit follow-up #3, 2026-07-20).
--
-- "Users can insert any notifications" had WITH CHECK (true) — any signed-in
-- user could insert a notifications row for ANY user_id with arbitrary
-- title/message/type/link (e.g. a forged "Payment received" notice). Notably,
-- the comment in src/backend/notify.ts already assumed RLS restricted this to
-- self-inserts ("RLS only allows inserting user_id = auth.uid() ... cross-user
-- inserts will be blocked") and has a try/catch fallback for that case — the
-- live policy just never matched that assumption.
--
-- Fix: restrict inserts to (a) your own user_id, (b) admins notifying anyone
-- (testimonial/verification/payout admin actions), or (c) a caller who has an
-- actual relationship with the target user. Catalogued every notify() call
-- site in the app first (src/backend/{admin,client-bookings,client-reviews,
-- client-shopping,pro-verification,return-requests,testimonials}.ts) — every
-- cross-user notify() is backed by an existing client_bookings, client_shopping,
-- client_reviews, or return_request row between the two users, so this is a
-- pure RLS tightening with zero application-code changes required.
--
-- Safe to re-run.

drop policy if exists "Users can insert any notifications" on public.notifications;
drop policy if exists "Users can insert own or related notifications" on public.notifications;

create policy "Users can insert own or related notifications"
on public.notifications for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.client_bookings b
    where (b.client_id = auth.uid() and b.tradesperson_id = notifications.user_id)
       or (b.tradesperson_id = auth.uid() and b.client_id = notifications.user_id)
  )
  or exists (
    select 1 from public.client_shopping s
    where (s.client_id = auth.uid() and s.tradesperson_id = notifications.user_id)
       or (s.tradesperson_id = auth.uid() and s.client_id = notifications.user_id)
  )
  or exists (
    select 1 from public.client_reviews r
    where (r.client_id = auth.uid() and r.tradesperson_id = notifications.user_id)
       or (r.tradesperson_id = auth.uid() and r.client_id = notifications.user_id)
  )
  or exists (
    select 1 from public.return_request rr
    where (rr.client_id = auth.uid() and rr.tradesperson_id = notifications.user_id)
       or (rr.tradesperson_id = auth.uid() and rr.client_id = notifications.user_id)
  )
);
