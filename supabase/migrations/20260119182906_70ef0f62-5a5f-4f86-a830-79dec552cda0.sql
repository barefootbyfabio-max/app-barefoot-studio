-- Add policy for professors to update all profiles (for approvals)
CREATE POLICY "Professors can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_professor(auth.uid()))
WITH CHECK (is_professor(auth.uid()));