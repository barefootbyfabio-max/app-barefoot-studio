-- A função existe, vamos recriá-la com CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.get_credit_week_start(
  p_date date DEFAULT CURRENT_DATE,
  p_time time DEFAULT CURRENT_TIME
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_dow INTEGER;
  v_result DATE;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::integer;
  
  -- Sexta-feira (5) após 12h → próxima segunda
  IF v_dow = 5 AND p_time >= '12:00:00'::time THEN
    v_result := p_date + 3;
  -- Sábado (6) → próxima segunda
  ELSIF v_dow = 6 THEN
    v_result := p_date + 2;
  -- Domingo (0) → próxima segunda
  ELSIF v_dow = 0 THEN
    v_result := p_date + 1;
  -- Segunda (1) → própria segunda
  ELSIF v_dow = 1 THEN
    v_result := p_date;
  -- Terça a Sexta (antes 12h) → volta para segunda
  ELSE
    v_result := p_date - (v_dow - 1);
  END IF;
  
  RETURN v_result;
END;
$$;