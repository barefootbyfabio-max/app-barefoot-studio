-- Create table for fixed booking exceptions (when a fixed student skips a specific day)
CREATE TABLE public.fixed_booking_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_booking_id uuid NOT NULL REFERENCES public.fixed_bookings(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fixed_booking_id, exception_date)
);

-- Enable RLS
ALTER TABLE public.fixed_booking_exceptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own exceptions
CREATE POLICY "Users can manage own exceptions"
ON public.fixed_booking_exceptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fixed_bookings fb
    WHERE fb.id = fixed_booking_id AND fb.aluno_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fixed_bookings fb
    WHERE fb.id = fixed_booking_id AND fb.aluno_id = auth.uid()
  )
);

-- Professors can view all exceptions
CREATE POLICY "Professors can view all exceptions"
ON public.fixed_booking_exceptions FOR SELECT
TO authenticated
USING (is_professor(auth.uid()));