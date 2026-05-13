-- Add DELETE policy for students to cancel their own bookings
CREATE POLICY "Users can delete own bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (auth.uid() = aluno_id);