-- Atomic cancellation + credit refund.
-- Cancelamento (avulso ou liberação de dia fixo) precisa devolver o crédito
-- na MESMA transação. As chamadas separadas no front podem deixar o aluno
-- sem crédito se a 2ª chamada falhar.

-- Cancela um booking avulso do próprio aluno autenticado e devolve o crédito.
-- Retorna a booking_date para o cliente usar em notificações.
CREATE OR REPLACE FUNCTION public.cancel_booking_with_refund(p_booking_id uuid)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aluno_id uuid;
  v_booking_date date;
BEGIN
  SELECT aluno_id, booking_date INTO v_aluno_id, v_booking_date
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_aluno_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.bookings WHERE id = p_booking_id;

  PERFORM public.refund_credit(v_aluno_id, v_booking_date);

  RETURN v_booking_date;
END;
$$;

-- Libera um dia de horário fixo (cria exception) e devolve o crédito atomicamente.
CREATE OR REPLACE FUNCTION public.skip_fixed_day_with_refund(
  p_fixed_booking_id uuid,
  p_exception_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aluno_id uuid;
  v_exception_id uuid;
BEGIN
  SELECT aluno_id INTO v_aluno_id
  FROM public.fixed_bookings
  WHERE id = p_fixed_booking_id;

  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Fixed booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_aluno_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to skip this fixed booking day' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.fixed_booking_exceptions (fixed_booking_id, exception_date)
  VALUES (p_fixed_booking_id, p_exception_date)
  RETURNING id INTO v_exception_id;

  PERFORM public.refund_credit(v_aluno_id, p_exception_date);

  RETURN v_exception_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_with_refund(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_fixed_day_with_refund(uuid, date) TO authenticated;
