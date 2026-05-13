-- Corrigir ambiguidade de nomes nas funções de crédito

-- 1. Corrigir versão com data
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_credits(p_student_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(credits_used integer, credits_total integer, week_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_plan_credits INTEGER;
  v_credits_used INTEGER;
  v_credits_total INTEGER;
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
  
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  SELECT ct.credits_used, ct.credits_total, ct.week_start
  INTO v_credits_used, v_credits_total, v_week_start
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  credits_used := v_credits_used;
  credits_total := v_credits_total;
  week_start := v_week_start;
  RETURN NEXT;
  RETURN;
END;
$$;

-- 2. Corrigir versão sem data (usa CURRENT_DATE)
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_credits(p_student_id uuid)
RETURNS TABLE(credits_used integer, credits_total integer, week_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_plan_credits INTEGER;
  v_credits_used INTEGER;
  v_credits_total INTEGER;
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
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  SELECT ct.credits_used, ct.credits_total, ct.week_start
  INTO v_credits_used, v_credits_total, v_week_start
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  credits_used := v_credits_used;
  credits_total := v_credits_total;
  week_start := v_week_start;
  RETURN NEXT;
  RETURN;
END;
$$;