-- Enum para tipos de plano
CREATE TYPE public.plan_type AS ENUM ('2x', '3x');

-- Tabela para armazenar o plano do aluno
CREATE TABLE public.student_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE,
  plan_type plan_type NOT NULL,
  weekly_credits INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para transações de crédito semanais
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  week_start DATE NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, week_start)
);

-- Enable RLS
ALTER TABLE public.student_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_student_plans_updated_at
BEFORE UPDATE ON public.student_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_transactions_updated_at
BEFORE UPDATE ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para student_plans
CREATE POLICY "Users can view own plan"
ON public.student_plans
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Professors can view all plans"
ON public.student_plans
FOR SELECT
USING (is_professor(auth.uid()));

CREATE POLICY "Professors can manage all plans"
ON public.student_plans
FOR ALL
USING (is_professor(auth.uid()));

CREATE POLICY "Users can insert own plan"
ON public.student_plans
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- RLS Policies para credit_transactions
CREATE POLICY "Users can view own credits"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Professors can view all credits"
ON public.credit_transactions
FOR SELECT
USING (is_professor(auth.uid()));

CREATE POLICY "Professors can manage all credits"
ON public.credit_transactions
FOR ALL
USING (is_professor(auth.uid()));

-- Função para obter ou criar transação de crédito da semana atual
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
  -- Calcular início da semana (segunda-feira)
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  
  -- Buscar créditos do plano do aluno
  SELECT sp.weekly_credits INTO v_plan_credits
  FROM public.student_plans sp
  WHERE sp.student_id = p_student_id AND sp.is_active = true;
  
  -- Se não tem plano, retornar 0
  IF v_plan_credits IS NULL THEN
    RETURN QUERY SELECT 0, 0, v_week_start;
    RETURN;
  END IF;
  
  -- Inserir ou atualizar transação da semana
  INSERT INTO public.credit_transactions (student_id, week_start, credits_used, credits_total)
  VALUES (p_student_id, v_week_start, 0, v_plan_credits)
  ON CONFLICT (student_id, week_start) DO NOTHING;
  
  -- Retornar créditos da semana
  RETURN QUERY
  SELECT ct.credits_used, ct.credits_total, ct.week_start
  FROM public.credit_transactions ct
  WHERE ct.student_id = p_student_id AND ct.week_start = v_week_start;
END;
$$;

-- Função para consumir crédito
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
  
  -- Verificar créditos disponíveis
  SELECT (credits_total - credits_used) INTO v_available
  FROM public.credit_transactions
  WHERE student_id = p_student_id AND week_start = v_week_start;
  
  IF v_available IS NULL OR v_available <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Consumir crédito
  UPDATE public.credit_transactions
  SET credits_used = credits_used + 1
  WHERE student_id = p_student_id AND week_start = v_week_start;
  
  RETURN TRUE;
END;
$$;

-- Função para devolver crédito (quando cancela 6h+ antes)
CREATE OR REPLACE FUNCTION public.refund_credit(p_student_id UUID, p_booking_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Calcular a semana do agendamento
  v_week_start := date_trunc('week', p_booking_date)::DATE;
  
  -- Devolver crédito
  UPDATE public.credit_transactions
  SET credits_used = GREATEST(credits_used - 1, 0)
  WHERE student_id = p_student_id AND week_start = v_week_start;
  
  RETURN FOUND;
END;
$$;