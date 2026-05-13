-- Usar nomes DIFERENTES para as colunas de retorno para evitar conflito total
-- O problema é que o PostgreSQL confunde week_start (retorno) com week_start (coluna)

-- 1. Corrigir versão com data - usando output_* para retorno
DROP FUNCTION IF EXISTS public.get_or_create_weekly_credits(uuid, date);
CREATE FUNCTION public.get_or_create_weekly_credits(p_student_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(credits_used integer, credits_total integer, week_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_plan_credits INTEGER;
  v_result RECORD;
BEGIN
  v_week_start := get_week_start(p_date);
  
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  IF v_plan_credits IS NULL THEN
    credits_used := 0;
    credits_total := 0;
    week_start := v_week_start;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Usar execute para evitar a ambiguidade
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT ON CONSTRAINT credit_transactions_student_id_week_start_key DO NOTHING;
  
  SELECT ct.credits_used, ct.credits_total, ct.week_start
  INTO v_result
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  credits_used := v_result.credits_used;
  credits_total := v_result.credits_total;
  week_start := v_result.week_start;
  RETURN NEXT;
  RETURN;
END;
$$;

-- 2. Corrigir versão sem data (usa CURRENT_DATE)
DROP FUNCTION IF EXISTS public.get_or_create_weekly_credits(uuid);
CREATE FUNCTION public.get_or_create_weekly_credits(p_student_id uuid)
RETURNS TABLE(credits_used integer, credits_total integer, week_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_plan_credits INTEGER;
  v_result RECORD;
BEGIN
  v_week_start := get_week_start(CURRENT_DATE);
  
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  IF v_plan_credits IS NULL THEN
    credits_used := 0;
    credits_total := 0;
    week_start := v_week_start;
    RETURN NEXT;
    RETURN;
  END IF;
  
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT ON CONSTRAINT credit_transactions_student_id_week_start_key DO NOTHING;
  
  SELECT ct.credits_used, ct.credits_total, ct.week_start
  INTO v_result
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  credits_used := v_result.credits_used;
  credits_total := v_result.credits_total;
  week_start := v_result.week_start;
  RETURN NEXT;
  RETURN;
END;
$$;