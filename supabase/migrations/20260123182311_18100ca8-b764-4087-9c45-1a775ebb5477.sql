-- 1. Corrigir get_week_start para retornar segunda-feira como início da semana
CREATE OR REPLACE FUNCTION public.get_week_start(p_date DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXTRACT(DOW FROM p_date) = 0 THEN p_date - INTERVAL '6 days'
    ELSE p_date - (EXTRACT(DOW FROM p_date) - 1) * INTERVAL '1 day'
  END::DATE;
$$;