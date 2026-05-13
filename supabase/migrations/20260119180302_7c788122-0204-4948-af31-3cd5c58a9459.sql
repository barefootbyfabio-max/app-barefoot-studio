-- Criar função de validação de limite diário
CREATE OR REPLACE FUNCTION public.check_daily_booking_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_booking_count INTEGER;
  active_fixed_booking_count INTEGER;
BEGIN
  -- Contar bookings regulares do aluno na mesma data
  SELECT COUNT(*) INTO existing_booking_count
  FROM public.bookings
  WHERE aluno_id = NEW.aluno_id
    AND booking_date = NEW.booking_date
    AND status = 'confirmado';

  IF existing_booking_count > 0 THEN
    RAISE EXCEPTION 'Você já possui uma aula agendada para esta data';
  END IF;

  -- Verificar se tem fixed booking ativo para este dia da semana
  SELECT COUNT(*) INTO active_fixed_booking_count
  FROM public.fixed_bookings fb
  INNER JOIN public.time_slots ts ON ts.id = fb.time_slot_id
  LEFT JOIN public.fixed_booking_exceptions fbe 
    ON fbe.fixed_booking_id = fb.id 
    AND fbe.exception_date = NEW.booking_date
  WHERE fb.aluno_id = NEW.aluno_id
    AND fb.approval_status = 'approved'
    AND ts.day_of_week = EXTRACT(DOW FROM NEW.booking_date)
    AND (fb.start_date IS NULL OR fb.start_date <= NEW.booking_date)
    AND (fb.end_date IS NULL OR fb.end_date >= NEW.booking_date)
    AND fbe.id IS NULL;

  IF active_fixed_booking_count > 0 THEN
    RAISE EXCEPTION 'Você já possui uma vaga fixa neste dia da semana';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger na tabela bookings
CREATE TRIGGER enforce_daily_booking_limit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_daily_booking_limit();