-- DC Fine Foods Dashboard — RLS Policy Debug & Fix
-- Run this in Supabase SQL Editor if admin role/status changes fail silently
-- ============================================================

-- Check if the required policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- If "Managers can manage profiles" is missing, recreate it:
-- (This is the policy that allows managers to approve/suspend/change roles)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Managers can manage profiles'
  ) THEN
    RAISE NOTICE 'MISSING: "Managers can manage profiles" policy — creating it now';

    EXECUTE '
      CREATE POLICY "Managers can manage profiles"
        ON public.profiles FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = ''manager'' AND account_status = ''approved''
          )
        )
    ';
  ELSE
    RAISE NOTICE 'OK: "Managers can manage profiles" policy exists';
  END IF;
END
$$;

-- Verify RLS is enabled on profiles
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- If RLS is not enabled:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
