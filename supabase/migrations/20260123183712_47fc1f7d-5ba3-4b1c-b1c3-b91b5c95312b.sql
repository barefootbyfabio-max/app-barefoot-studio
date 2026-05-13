-- Correção: a semana deve sempre começar na SEGUNDA
-- O problema: quando é sexta após 12h, sáb ou dom, o week_start deve ser a PRÓXIMA SEGUNDA

DROP FUNCTION IF EXISTS public.get_credit_week_start(date, time);
CREATE FUNCTION public.get_credit_week_start(
  p_date date DEFAULT CURRENT_DATE,
  p_time time DEFAULT CURRENT_TIME
)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE 
    -- Sexta-feira após 12h → próxima segunda (sexta + 3 dias)
    WHEN EXTRACT(DOW FROM p_date) = 5 AND p_time >= '12:00:00'::time 
      THEN (p_date + INTERVAL '3 days')::date
    -- Sábado → próxima segunda (sábado + 2 dias)
    WHEN EXTRACT(DOW FROM p_date) = 6 
      THEN (p_date + INTERVAL '2 days')::date
    -- Domingo → próxima segunda (domingo + 1 dia)
    WHEN EXTRACT(DOW FROM p_date) = 0 
      THEN (p_date + INTERVAL '1 day')::date
    -- Segunda a Sexta (antes 12h) → segunda da semana atual
    -- Segunda = DOW 1, então volta (DOW - 1) dias
    ELSE (p_date - ((EXTRACT(DOW FROM p_date)::integer - 1) * INTERVAL '1 day'))::date
  END;
$$;