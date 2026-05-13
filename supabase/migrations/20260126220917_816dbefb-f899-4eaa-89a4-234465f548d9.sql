-- Add RLS policy for professors to delete student profiles
CREATE POLICY "Professors can delete student profiles"
ON public.profiles
FOR DELETE
USING (
  is_professor(auth.uid()) 
  AND role = 'aluno'
);