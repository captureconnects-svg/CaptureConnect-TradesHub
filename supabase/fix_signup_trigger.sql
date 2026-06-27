-- ============================================================
-- STEP 1: Drop the old trigger that wrote to BOTH tables on signup
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- STEP 2: Create a new trigger that only writes to ONE table
--         based on the user_type stored in signup metadata.
--         user_type = 'client'       → client_profiles only
--         user_type = 'tradesperson' → tradesperson_profiles only
--         No user_type (Google OAuth without metadata) → no insert;
--         the auth-callback route handles it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT;
BEGIN
  v_type := NEW.raw_user_meta_data->>'user_type';

  IF v_type = 'client' THEN
    INSERT INTO public.client_profiles (id, full_name, email, role, account_status, active_role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      'client',
      'active',
      true
    )
    ON CONFLICT (id) DO NOTHING;

  ELSIF v_type = 'tradesperson' THEN
    INSERT INTO public.tradesperson_profiles (id, full_name, email, role, account_status, active_role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      'tradesperson',
      'active',
      true
    )
    ON CONFLICT (id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: Clean up existing spurious records created by the old trigger.
--
-- Logic:
--   • A user whose auth metadata says user_type = 'client' should have
--     NO tradesperson_profiles record UNLESS their client_profiles.active_role
--     is false (meaning they already switched to pro intentionally).
--
--   • A user whose auth metadata says user_type = 'tradesperson' should have
--     NO client_profiles record UNLESS their tradesperson_profiles.active_role
--     is false (meaning they already switched to client intentionally).
--
-- Review the SELECT versions below first, then run the DELETE versions.
-- ============================================================

-- Preview: spurious tradesperson records for client-signed-up users
-- SELECT tp.id, tp.email
-- FROM public.tradesperson_profiles tp
-- JOIN auth.users au ON au.id = tp.id
-- WHERE au.raw_user_meta_data->>'user_type' = 'client'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.client_profiles cp
--     WHERE cp.id = tp.id AND cp.active_role = false
--   );

-- Delete them:
DELETE FROM public.tradesperson_profiles tp
WHERE EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = tp.id
    AND au.raw_user_meta_data->>'user_type' = 'client'
)
AND NOT EXISTS (
  SELECT 1 FROM public.client_profiles cp
  WHERE cp.id = tp.id AND cp.active_role = false
);

-- Preview: spurious client records for tradesperson-signed-up users
-- SELECT cp.id, cp.email
-- FROM public.client_profiles cp
-- JOIN auth.users au ON au.id = cp.id
-- WHERE au.raw_user_meta_data->>'user_type' = 'tradesperson'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.tradesperson_profiles tp
--     WHERE tp.id = cp.id AND tp.active_role = false
--   );

-- Delete them:
DELETE FROM public.client_profiles cp
WHERE EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = cp.id
    AND au.raw_user_meta_data->>'user_type' = 'tradesperson'
)
AND NOT EXISTS (
  SELECT 1 FROM public.tradesperson_profiles tp
  WHERE tp.id = cp.id AND tp.active_role = false
);
