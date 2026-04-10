
-- Phase 1: Timesheet Approval
ALTER TABLE public.timesheet_entries 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.timesheet_entries.approved_at IS 'Data/hora em que o lançamento foi aprovado no pré-relatório.';
COMMENT ON COLUMN public.timesheet_entries.approved_by IS 'Usuário (gestor) que aprovou o lançamento.';

-- Phase 2: Billing Provisions (Consolidated by Client/Month)
CREATE TABLE IF NOT EXISTS public.billing_provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    month TEXT NOT NULL, -- format YYYY-MM
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'invoiced', 'cancelled')),
    total_value NUMERIC(15, 2) DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(client_id, month)
);

-- Phase 3: Bonus Provisions (Consolidated by User/Month with 4-month delay)
CREATE TABLE IF NOT EXISTS public.bonus_provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    month TEXT NOT NULL, -- format YYYY-MM
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    total_value NUMERIC(15, 2) DEFAULT 0,
    payout_date DATE NOT NULL,
    calculation_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, month)
);

-- Phase 4: Activity Types Weights (As per User Policy)
-- First, ensure weight column exists (it should, but just in case)
-- 30% Weights
UPDATE public.activity_types SET weight = 0.3 WHERE name IN (
    'Atualização de Cálculo', 
    'Cálculo de Atualização de Sentença', 
    'Cálculo de Atualização de Acórdão', 
    'Cálculo de Atualização de Inicial', 
    'Quesitos e Assistente'
);

-- 20% Weights
UPDATE public.activity_types SET weight = 0.2 WHERE name = 'Discriminação de Acordo';

-- 10% Weights
UPDATE public.activity_types SET weight = 0.1 WHERE name = 'Cálculo de Segunda Hipótese';

-- 100% Weights (Meta)
UPDATE public.activity_types SET weight = 1.0 WHERE name IN (
    'Impugnação/ Embargos / Apresentação', 
    'Cálculo de Decisão', 
    'Cálculo de Inicial'
);

-- Phase 5: Permissions
GRANT ALL ON public.billing_provisions TO service_role, authenticated;
GRANT ALL ON public.bonus_provisions TO service_role, authenticated;

-- RLS
ALTER TABLE public.billing_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_provisions ENABLE ROW LEVEL SECURITY;

-- Note: Using existing helper functions is_financeiro and is_admin_or_manager
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view billing_provisions') THEN
        CREATE POLICY "Authenticated users can view billing_provisions" ON public.billing_provisions FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Financeiro and admins can manage billing_provisions') THEN
        CREATE POLICY "Financeiro and admins can manage billing_provisions" ON public.billing_provisions FOR ALL TO authenticated USING (is_financeiro(auth.uid()) OR is_admin_or_manager(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own bonus_provisions') THEN
        CREATE POLICY "Users can view their own bonus_provisions" ON public.bonus_provisions FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin_or_manager(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage bonus_provisions') THEN
        CREATE POLICY "Admins can manage bonus_provisions" ON public.bonus_provisions FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid()));
    END IF;
END $$;
