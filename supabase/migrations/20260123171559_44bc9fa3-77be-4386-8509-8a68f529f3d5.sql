-- Corrigir get_or_create_weekly_credits renomeando coluna de retorno
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_credits(p_student_id UUID)
RETURNS TABLE(credits_used INTEGER, credits_total INTEGER, week_start DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_week DATE;
  v_plan_credits INTEGER;
BEGIN
  v_current_week := date_trunc('week', CURRENT_DATE)::DATE;
  
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  IF v_plan_credits IS NULL THEN
    credits_used := 0;
    credits_total := 0;
    week_start := v_current_week;
    RETURN NEXT;
    RETURN;
  END IF;
  
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_current_week, 0, v_plan_credits)
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  -- Usar RETURN NEXT para evitar ambiguidade
  FOR credits_used, credits_total, week_start IN
    SELECT 
      ct.credits_used, 
      ct.credits_total, 
      ct.week_start
    FROM public.credit_transactions ct
    WHERE ct.student_id = p_student_id 
      AND ct.week_start = v_current_week
  LOOP
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Corrigir consume_credit
CREATE OR REPLACE FUNCTION public.consume_credit(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_week DATE;
  v_available INTEGER;
BEGIN
  v_current_week := date_trunc('week', CURRENT_DATE)::DATE;
  
  SELECT (ct.credits_total - ct.credits_used) INTO v_available
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_current_week;
  
  IF v_available IS NULL OR v_available <= 0 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.credit_transactions
  SET credits_used = credits_used + 1
  WHERE student_id = p_student_id 
    AND week_start = v_current_week;
  
  RETURN TRUE;
END;
$$;

-- Corrigir refund_credit
CREATE OR REPLACE FUNCTION public.refund_credit(p_student_id UUID, p_booking_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_week DATE;
BEGIN
  v_booking_week := date_trunc('week', p_booking_date)::DATE;
  
  UPDATE public.credit_transactions
  SET credits_used = GREATEST(credits_used - 1, 0)
  WHERE student_id = p_student_id 
    AND week_start = v_booking_week;
  
  RETURN FOUND;
END;
$$;