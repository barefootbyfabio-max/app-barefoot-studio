-- Permitir que o aluno atualize o próprio student_plans.
-- Sem isso, o UpgradePlanDialog (escolher plano após a trial)
-- chama UPDATE, RLS filtra silenciosamente e o aluno fica preso
-- como 'experimental' mesmo após "ativar" um plano.

CREATE POLICY "Users can update own plan"
ON public.student_plans
FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
