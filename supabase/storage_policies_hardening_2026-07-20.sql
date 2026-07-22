-- Storage bucket RLS hardening (audit follow-up, 2026-07-20).
-- The 2026-07-20 audit locked down every *table*'s RLS, but storage.objects
-- policies live entirely outside tracked migrations (created ad hoc via
-- Studio's bucket policy UI) and were never reviewed. Cross-checking
-- pg_policies on the live linked project against this file's predecessors
-- turned up three real gaps:
--
-- 1. conversations bucket: bucket was flagged public=true with a
--    "public read"/"any authenticated can upload to any folder" policy pair,
--    even though the app (src/backend/conversations.ts) only ever reads
--    attachments via short-lived signed URLs and never calls getPublicUrl().
--    Folder = conversation id (e.g. "42/171234.jpg"), which is a small
--    sequential bigint — trivially enumerable. Any signed-in user (or, via
--    the public bucket flag, literally anyone) could read or plant files in
--    any other user's conversation. Fixed by flipping the bucket private and
--    scoping SELECT/INSERT to the two conversation participants (+ admin).
--
-- 2. landing_testimonials and pro_merchandise buckets: UPDATE/DELETE
--    policies ("landtest_UPDATE/DELETE cxkfks_0", "pro_merchUPDATE/DELETE
--    la2629_0") had no ownership check at all — any authenticated user could
--    overwrite or delete any other user's testimonial photo or merchandise
--    image. INSERT/SELECT on the same buckets were correctly folder-scoped,
--    so this was an inconsistency, not deliberate design.
--
-- 3. return_evidence bucket: drift duplicates of the tracked policies in
--    return_evidence_storage_policies.sql, plus a dead "admins_all_return_evidence"
--    FOR ALL policy gating on auth.jwt() ->> 'app_role' — a claim nothing in
--    this codebase ever sets. Not currently exploitable (the claim is always
--    null), but it's exactly the kind of untracked "ALL/public" policy the
--    table-level audit flagged as the highest-risk pattern, so it's dropped
--    rather than left dormant.
--
-- Safe to re-run: every policy is dropped by name before being recreated.

-- ── conversations: make private, scope to conversation participants ───────

update storage.buckets set public = false where id = 'conversations';

drop policy if exists "conversations: public read" on storage.objects;
drop policy if exists "conversations: authenticated upload" on storage.objects;
drop policy if exists "conversations: owner delete" on storage.objects;
drop policy if exists "conversations: participants read" on storage.objects;
drop policy if exists "conversations: participants upload" on storage.objects;

create policy "conversations: participants read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'conversations' and (
    public.is_admin() or exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.client_id = auth.uid() or c.tradesperson_id = auth.uid())
    )
  )
);

create policy "conversations: participants upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'conversations' and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (c.client_id = auth.uid() or c.tradesperson_id = auth.uid())
  )
);

create policy "conversations: owner delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'conversations' and owner = auth.uid());

-- ── landing_testimonials: owner (or admin) required for update/delete ─────

drop policy if exists "landtest_UPDATE cxkfks_0" on storage.objects;
drop policy if exists "landtest_DELETE cxkfks_0" on storage.objects;
drop policy if exists "landing_testimonials: owner update" on storage.objects;
drop policy if exists "landing_testimonials: owner delete" on storage.objects;

create policy "landing_testimonials: owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'landing_testimonials' and (
    (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
  )
);

create policy "landing_testimonials: owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'landing_testimonials' and (
    (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
  )
);

-- ── pro_merchandise: owner (or admin) required for update/delete ──────────

drop policy if exists "pro_merchUPDATE la2629_0" on storage.objects;
drop policy if exists "pro_merchDELETE la2629_0" on storage.objects;
drop policy if exists "pro_merchandise: owner update" on storage.objects;
drop policy if exists "pro_merchandise: owner delete" on storage.objects;

create policy "pro_merchandise: owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'pro_merchandise' and (
    (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
  )
);

create policy "pro_merchandise: owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pro_merchandise' and (
    (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
  )
);

-- ── return_evidence: drop untracked drift, keep the tracked policies ──────
-- (return_evidence_storage_policies.sql already defines the correct
-- "Clients can upload/read return evidence", "Pros can read evidence for
-- their requests", and "Admins can read all return evidence" policies.)

drop policy if exists "admins_all_return_evidence" on storage.objects;
drop policy if exists "clients_read_return_evidence" on storage.objects;
drop policy if exists "clients_upload_return_evidence" on storage.objects;
