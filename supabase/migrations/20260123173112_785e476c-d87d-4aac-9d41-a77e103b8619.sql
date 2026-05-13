-- Função auxiliar para calcular início da semana (domingo)
CREATE OR REPLACE FUNCTION public.get_week_start(p_date DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (date_trunc('week', p_date + INTERVAL '1 day') - INTERVAL '1 day')::DATE;
$$;

-- Recriar get_or_create_weekly_credits com domingo como início
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_credits(p_student_id UUID)
RETURNS TABLE(credits_used INTEGER, credits_total INTEGER, week_start DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_plan_credits INTEGER;
BEGIN
  -- Calcula início da semana (domingo)
  v_week_start := get_week_start(CURRENT_DATE);
  
  -- Busca créditos do plano ativo
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  -- Se não tem plano, retorna zeros
  IF v_plan_credits IS NULL THEN
    credits_used := 0;
    credits_total := 0;
    week_start := v_week_start;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Insere registro se não existir
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  -- Retorna os valores
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

-- Recriar consume_credit com domingo e garantindo registro existe
CREATE OR REPLACE FUNCTION public.consume_credit(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_available INTEGER;
BEGIN
  v_week_start := get_week_start(CURRENT_DATE);
  
  -- Primeiro garante que o registro existe
  PERFORM get_or_create_weekly_credits(p_student_id);
  
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

-- Recriar refund_credit com domingo e garantindo registro existe
CREATE OR REPLACE FUNCTION public.refund_credit(p_student_id UUID, p_booking_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := get_week_start(p_booking_date);
  
  -- Primeiro garante que o registro existe para poder fazer o refund
  PERFORM get_or_create_weekly_credits(p_student_id);
  
  UPDATE public.credit_transactions
  SET credits_used = GREATEST(credits_used - 1, 0), updated_at = now()
  WHERE student_id = p_student_id 
    AND week_start = v_week_start;
  
  RETURN FOUND;
END;
$$;