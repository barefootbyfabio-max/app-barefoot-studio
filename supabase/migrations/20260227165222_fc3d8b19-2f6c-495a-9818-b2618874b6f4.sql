
-- Add foreign key from student_plans.student_id to profiles.id
ALTER TABLE public.student_plans
  ADD CONSTRAINT student_plans_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
