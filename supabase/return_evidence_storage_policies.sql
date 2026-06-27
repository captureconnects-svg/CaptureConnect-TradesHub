-- Storage policies for the return_evidence private bucket.
-- Run this in the Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run: drops any existing policies with these names first.

DROP POLICY IF EXISTS "Clients can upload return evidence"          ON storage.objects;
DROP POLICY IF EXISTS "Clients can read own return evidence"        ON storage.objects;
DROP POLICY IF EXISTS "Pros can read evidence for their requests"   ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all return evidence"         ON storage.objects;

-- Helper function: storage policies cannot directly query auth.users, so wrap
-- the admin check in a SECURITY DEFINER function which runs with elevated privileges.
CREATE OR REPLACE FUNCTION public.is_return_evidence_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
$$;

-- 1. Clients can upload to their own folder only.
--    Path structure: {client_uuid}/{request_id}/{filename}
CREATE POLICY "Clients can upload return evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'return_evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Clients can create signed URLs for their own evidence files.
CREATE POLICY "Clients can read own return evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'return_evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Pros can create signed URLs for evidence on their own return requests.
--    The second path segment is the request_id; we check it matches a request
--    where the current user is the tradesperson.
CREATE POLICY "Pros can read evidence for their requests"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'return_evidence' AND
  EXISTS (
    SELECT 1 FROM public.return_request rr
    WHERE rr.tradesperson_id = auth.uid()
      AND rr.id::text = (storage.foldername(name))[2]
  )
);

-- 4. Admins can create signed URLs for ALL evidence files.
CREATE POLICY "Admins can read all return evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'return_evidence' AND
  public.is_return_evidence_admin()
);
