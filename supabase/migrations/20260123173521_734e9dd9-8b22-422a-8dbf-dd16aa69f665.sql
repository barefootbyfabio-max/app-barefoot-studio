-- Remover política que expõe todos os bookings
DROP POLICY IF EXISTS "Users can view all bookings" ON public.bookings;

-- Criar política para alunos verem apenas seus próprios bookings
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = aluno_id);

-- Criar política para professores verem todos os bookings
CREATE POLICY "Professors can view all bookings"
ON public.bookings
FOR SELECT
USING (is_professor(auth.uid()));