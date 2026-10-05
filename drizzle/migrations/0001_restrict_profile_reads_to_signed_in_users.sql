DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "authenticated profile read"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);