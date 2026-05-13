-- Recriar função get_or_create_weekly_credits com nomes sem ambiguidade
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
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  IF v_plan_credits IS NULL THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, v_week_start;
    RETURN;
  END IF;
  
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  -- Usar alias explícito para evitar ambiguidade
  RETURN QUERY
  SELECT 
    ct.credits_used::INTEGER, 
    ct.credits_total::INTEGER, 
    ct.week_start::DATE
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
END;
$$;

-- Recriar consume_credit com prefixos explícitos
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
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  
  SELECT (ct.credits_total - ct.credits_used) INTO v_available
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  IF v_available IS NULL OR v_available <= 0 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.credit_transactions ct
  SET credits_used = ct.credits_used + 1
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  RETURN TRUE;
END;
$$;

-- Recriar refund_credit com prefixos explícitos
CREATE OR REPLACE FUNCTION public.refund_credit(p_student_id UUID, p_booking_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := date_trunc('week', p_booking_date)::DATE;
  
  UPDATE public.credit_transactions ct
  SET credits_used = GREATEST(ct.credits_used - 1, 0)
  WHERE ct.student_id = p_student_id 
    AND ct.week_start = v_week_start;
  
  RETURN FOUND;
END;
$$;