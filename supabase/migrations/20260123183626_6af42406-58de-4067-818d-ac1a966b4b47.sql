-- Nova função que considera a regra de negócio correta:
-- Semana vai de segunda a sexta, reset às 12h de sexta

CREATE OR REPLACE FUNCTION public.get_credit_week_start(
  p_date date DEFAULT CURRENT_DATE,
  p_time time DEFAULT CURRENT_TIME
)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE 
    -- Sexta-feira após 12h → próxima segunda
    WHEN EXTRACT(DOW FROM p_date) = 5 AND p_time >= '12:00:00'::time 
      THEN p_date + INTERVAL '3 days'
    -- Sábado → próxima segunda
    WHEN EXTRACT(DOW FROM p_date) = 6 
      THEN p_date + INTERVAL '2 days'
    -- Domingo → próxima segunda (amanhã)
    WHEN EXTRACT(DOW FROM p_date) = 0 
      THEN p_date + INTERVAL '1 day'
    -- Segunda a Sexta (antes 12h) → segunda da semana atual
    ELSE p_date - (EXTRACT(DOW FROM p_date) - 1) * INTERVAL '1 day'
  END::DATE;
$$;

-- Atualizar get_or_create_weekly_credits (versão com data)
-- Para aulas específicas, sempre usa 00:00 (a data da aula determina a semana)
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
  -- Para data específica de aula, usa 00:00 (só a data importa)
  v_week_start := get_credit_week_start(p_date, '00:00:00'::time);
  
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

-- Atualizar get_or_create_weekly_credits (versão sem data - usa horário atual)
-- Esta é usada para mostrar créditos disponíveis AGORA
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
  -- Para visualização atual, considera data E horário atual
  v_week_start := get_credit_week_start(CURRENT_DATE, CURRENT_TIME);
  
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

-- Atualizar consume_credit (versão com data)
DROP FUNCTION IF EXISTS public.consume_credit(uuid, date);
CREATE FUNCTION public.consume_credit(p_student_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_available INTEGER;
BEGIN
  -- Para aula específica, usa 00:00 (só a data importa)
  v_week_start := get_credit_week_start(p_date, '00:00:00'::time);
  
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

-- Atualizar consume_credit (versão sem data)
DROP FUNCTION IF EXISTS public.consume_credit(uuid);
CREATE FUNCTION public.consume_credit(p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_available INTEGER;
BEGIN
  v_week_start := get_credit_week_start(CURRENT_DATE, CURRENT_TIME);
  
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

-- Atualizar refund_credit
DROP FUNCTION IF EXISTS public.refund_credit(uuid, date);
CREATE FUNCTION public.refund_credit(p_student_id uuid, p_booking_date date)
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
  
  PERFORM get_or_create_weekly_credits(p_student_id, p_booking_date);
  
  UPDATE public.credit_transactions
  SET credits_used = GREATEST(credits_used - 1, 0), updated_at = now()
  WHERE student_id = p_student_id 
    AND week_start = v_week_start;
  
  RETURN FOUND;
END;
$$;