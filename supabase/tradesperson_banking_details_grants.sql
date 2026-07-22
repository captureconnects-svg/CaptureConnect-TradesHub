-- Base table-level grants for tradesperson_banking_details.
--
-- Tables created via the Supabase Table Editor in this project aren't
-- getting the standard anon/authenticated/service_role CRUD grants that
-- tables created through SQL migrations get (compare relacl for
-- client_bookings vs. this table) — RLS policies alone don't grant access;
-- Postgres checks table-level GRANTs first, and PostgREST runs as the
-- anon/authenticated role per request, so without this grant every request
-- fails with "permission denied for table" before RLS is ever evaluated.
--
-- Only `authenticated` needs access here (pros must be logged in); RLS
-- policies (tradesperson_banking_details_rls.sql) still restrict each pro
-- to their own row.
--
-- Run in Supabase SQL Editor. Safe to re-run.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tradesperson_banking_details TO authenticated;
