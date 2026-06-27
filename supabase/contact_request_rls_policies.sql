-- RLS policies for contact_request.
-- Anyone can submit a contact form; only admins can read or update.
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.contact_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a contact request"   ON public.contact_request;
DROP POLICY IF EXISTS "Admins can view contact requests"      ON public.contact_request;
DROP POLICY IF EXISTS "Admins can update contact requests"    ON public.contact_request;

-- Public INSERT so unauthenticated visitors can submit the contact form.
CREATE POLICY "Anyone can submit a contact request"
ON public.contact_request FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admin / super_admin users can read submissions.
CREATE POLICY "Admins can view contact requests"
ON public.contact_request FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
);

-- Only admins can mark requests as replied.
CREATE POLICY "Admins can update contact requests"
ON public.contact_request FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
      AND a.role IN ('admin', 'super_admin')
  )
);
