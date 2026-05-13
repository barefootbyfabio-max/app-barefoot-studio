-- Política para permitir alunos solicitarem horário fixo (sempre com status pending)
CREATE POLICY "Students can request fixed bookings"
ON public.fixed_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = aluno_id
  AND approval_status = 'pending'
);

-- Inserir horários das 20:30 - 21:30 (Segunda a Sexta)
INSERT INTO public.time_slots (day_of_week, start_time, end_time, capacity, duration_minutes, is_active)
VALUES 
  (1, '20:30:00', '21:30:00', 4, 60, true),
  (2, '20:30:00', '21:30:00', 4, 60, true),
  (3, '20:30:00', '21:30:00', 4, 60, true),
  (4, '20:30:00', '21:30:00', 4, 60, true),
  (5, '20:30:00', '21:30:00', 4, 60, true);