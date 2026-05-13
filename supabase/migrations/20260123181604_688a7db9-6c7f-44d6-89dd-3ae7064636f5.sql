-- Atualizar get_or_create_weekly_credits para aceitar data como parametro
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_credits(
  p_student_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(credits_used INTEGER, credits_total INTEGER, week_start DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_plan_credits INTEGER;
BEGIN
  -- Usa a data passada (nao CURRENT_DATE fixo)
  v_week_start := get_week_start(p_date);
  
  -- Busca creditos do plano ativo
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  -- Se nao tem plano, retorna zeros
  IF v_plan_credits IS NULL THEN
    credits_used := 0;
    credits_total := 0;
    week_start := v_week_start;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Insere registro para a semana correta
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  -- Retorna os valores da semana especificada
  FOR credits_used, credits_total, week_start IN
    SELECT ct.credits_used, ct.credits_total, ct.week_start
    FROM public.credit_transactions ct
    WHERE ct.student_id = p_student_id 
      AND ct.week_start = v_week_start
  LOOP
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Atualizar consume_credit para aceitar data da aula
CREATE OR REPLACE FUNCTION public.consume_credit(
  p_student_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_available INTEGER;
BEGIN
  v_week_start := get_week_start(p_date);
  
  -- Garante registro existe para a semana da aula
  PERFORM get_or_create_weekly_credits(p_student_id, p_date);
  
  SELECT (ct.credits_total - ct.credits_used) INTO v_available
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  IF v_available IS NULL OR v_available <= 0 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.credit_transactions
  SET credits_used = credits_used + 1, updated_at = now()
  WHERE student_id = p_student_id 
    AND week_start = v_week_start;
  
  RETURN TRUE;
END;
$$;

-- Atualizar refund_credit para criar registro na semana correta
CREATE OR REPLACE FUNCTION public.refund_credit(
  p_student_id UUID, 
  p_booking_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := get_week_start(p_booking_date);
  
  -- CORRECAO: Passa a data da aula para criar registro na semana correta
  PERFORM get_or_create_weekly_credits(p_student_id, p_booking_date);
  
  UPDATE public.credit_transactions
  SET credits_used = GREATEST(credits_used - 1, 0), updated_at = now()
  WHERE student_id = p_student_id 
    AND week_start = v_week_start;
  
  RETURN FOUND;
END;
$$;