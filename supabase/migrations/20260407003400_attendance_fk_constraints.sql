-- ─────────────────────────────────────────────────────────────
-- Migration: Adicionar FK constraints na tabela attendance
-- Execute no Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- FK: attendance.student_id → profiles.id
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- FK: attendance.time_slot_id → time_slots.id
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_time_slot_id_fkey
  FOREIGN KEY (time_slot_id)
  REFERENCES public.time_slots(id)
  ON DELETE CASCADE;

-- FK: attendance.marked_by → profiles.id
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_marked_by_fkey
  FOREIGN KEY (marked_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Index para queries por data (melhora performance de listagem diária)
CREATE INDEX IF NOT EXISTS idx_attendance_date
  ON public.attendance(attendance_date);

-- Index composto para queries de frequência por aluno
CREATE INDEX IF NOT EXISTS idx_attendance_student_status
  ON public.attendance(student_id, status);

-- RLS: garantir que está habilitado
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Política: professores podem fazer tudo
CREATE POLICY "Professores podem gerenciar presença"
  ON public.attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

-- Política: alunos podem ver apenas os próprios registros
CREATE POLICY "Alunos veem própria presença"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
