-- Corrigir função refund_credit para permitir créditos negativos temporários
-- Isso permite que liberações feitas antes do consumo sejam aplicadas corretamente

CREATE OR REPLACE FUNCTION public.refund_credit(p_student_id uuid, p_booking_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Para aula específica, usa 00:00 (só a data importa)
  v_week_start := get_credit_week_start(p_booking_date, '00:00:00'::time);
  
  -- Garante que o registro existe
  PERFORM get_or_create_weekly_credits(p_student_id, p_booking_date);
  
  -- Remove GREATEST para permitir valores negativos temporários
  -- Isso permite refunds "antecipados" que serão equilibrados quando consumos acontecerem
  UPDATE public.credit_transactions
  SET credits_used = credits_used - 1, updated_at = now()
  WHERE student_id = p_student_id 
    AND week_start = v_week_start;
  
  RETURN FOUND;
END;
$$;