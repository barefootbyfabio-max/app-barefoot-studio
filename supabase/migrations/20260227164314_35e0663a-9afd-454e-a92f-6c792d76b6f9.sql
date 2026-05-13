
-- Add 'experimental' to plan_type enum
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'experimental';

-- Create trial_classes table
CREATE TABLE public.trial_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date date,
  time_slot_id uuid REFERENCES public.time_slots(id),
  status text NOT NULL DEFAULT 'pending',
  scheduled_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE public.trial_classes ENABLE ROW LEVEL SECURITY;

-- Students can view their own trial class
CREATE POLICY "Users can view own trial class"
  ON public.trial_classes FOR SELECT
  USING (auth.uid() = student_id);

-- Professors can view all trial classes
CREATE POLICY "Professors can view all trial classes"
  ON public.trial_classes FOR SELECT
  USING (is_professor(auth.uid()));

-- Professors can manage all trial classes
CREATE POLICY "Professors can manage trial classes"
  ON public.trial_classes FOR ALL
  USING (is_professor(auth.uid()));

-- Students can update their own trial class (for plan upgrade)
CREATE POLICY "Users can update own trial class"
  ON public.trial_classes FOR UPDATE
  USING (auth.uid() = student_id);
