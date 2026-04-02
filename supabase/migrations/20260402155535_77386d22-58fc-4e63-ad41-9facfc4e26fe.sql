
-- Drop the overly permissive policy
DROP POLICY "System inserts profiles" ON public.profiles;

-- Create a more restrictive policy - profiles are created by the trigger function (SECURITY DEFINER)
-- Users should not be able to insert profiles directly
CREATE POLICY "Only system can insert profiles" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
